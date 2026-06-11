import { config } from "./config.js";
import { client, fetchBlock } from "./ingest/ingest.js";
import { RollingState } from "./engine/state.js";
import { RollingBaseline } from "./engine/baseline.js";
import { Cooldown } from "./engine/cooldown.js";
import { runDetectors } from "./detectors/index.js";
import { contractInteractionSpike } from "./detectors/contractInteractionSpike.js";
import { makePublisher } from "./chain/registry.js";
import { makeBot } from "./telegram/bot.js";
import { makeResolver, type PendingCall } from "./resolver/resolver.js";
import { priceForSubject } from "./resolver/price.js";
import { loadCursor, saveCursor } from "./state-cursor.js";
import { loadPending, savePending } from "./state-pending.js";
import { loadCount, saveCount } from "./state-count.js";
import { startSSE, broadcast } from "./sse.js";
import type { ChainEvent, Signal } from "@shared/types";

const POLL_MS = 5000;

const priceOf = priceForSubject;

// Subjects priced via the USDC/USDT pool never move past any sane threshold —
// inscribing them guarantees a meaningless miss. Excluded from inscription.
const STABLE_TOKENS = new Set([
  "0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9", // USDC
  "0x201eba5cc46d216ce6dc03f6a759e8e766e956ae", // USDT
]);

async function main() {
  const state = new RollingState({ windowSec: 24 * 3600 });
  const liquidityBaseline = new RollingBaseline(50);
  const interactionBaseline = new RollingBaseline(50);
  const cooldown = new Cooldown(3600);
  const publisher = makePublisher();
  const bot = makeBot();
  // Rehydrate in-flight calls so resolutions survive restarts.
  const pending: PendingCall[] = loadPending();
  let inscribed = loadCount(); // persisted campaign counter for the hard cap
  const resolver = makeResolver(priceOf);

  if (bot.configured) bot.start();
  startSSE(config.ssePort);

  let cursor = config.startBlock === "latest" ? await client.getBlockNumber() : loadCursor(BigInt(config.startBlock));
  let backoff = POLL_MS;

  async function publish(s: Signal, now: number) {
    if (s.score < config.minPublishScore) return;          // conviction floor
    if (s.priceToken && STABLE_TOKENS.has(s.priceToken.toLowerCase())) return; // stables can't hit any threshold
    if (!cooldown.allow(s.type, s.subject, s.ts)) return;
    if (!publisher.configured) {
      broadcast({ kind: "signal-dry", signal: { ...s, blockNumber: s.blockNumber.toString() } });
      return;
    }
    // HARD CAP: stop inscribing once the campaign limit is hit. Checked before
    // any RPC/gas so a capped run spends nothing further. Persisted, so a
    // restart cannot bypass it.
    if (config.maxInscriptions > 0 && inscribed >= config.maxInscriptions) {
      broadcast({ kind: "thinking", block: s.blockNumber.toString(), evKind: "cap-reached", subject: s.subject });
      return;
    }
    // Resolvability gate: compute the submit-time price baseline BEFORE spending
    // gas. If the subject can't be priced, the call could never resolve — so we
    // skip it rather than inscribe a permanently-pending, gas-wasting signal.
    const priceAt = s.priceToken ? await priceOf(s.priceToken) : 0;
    if (!priceAt || !isFinite(priceAt)) {
      broadcast({ kind: "thinking", block: s.blockNumber.toString(), evKind: "skip-unpriceable", subject: s.subject });
      return;
    }
    try {
      const tx = await publisher.submit(s);                 // on-chain FIRST
      inscribed++;
      saveCount(inscribed);                                 // bump the hard-cap counter
      pending.push({ id: s.id, type: s.type, direction: s.direction, subject: s.subject, submittedAt: s.ts, priceAt, priceToken: s.priceToken });
      savePending(pending);                                 // durable across restarts
      broadcast({ kind: "signal", signal: { ...s, blockNumber: s.blockNumber.toString() }, tx });
      if (bot.configured) bot.send(s, tx).catch((e) => broadcast({ kind: "degraded", reason: `telegram: ${String(e)}` })); // fire-and-forget
    } catch (e) {
      broadcast({ kind: "degraded", reason: "submit failed", id: s.id });
    }
  }

  for (;;) {
    try {
      const head = await client.getBlockNumber();
      while (cursor < head) {
        const bn = cursor + 1n;
        const { events, interactions, ts } = await fetchBlock(bn);
        const now = ts; // block time everywhere

        // Detection + inscription. Skipped entirely in resolve-only mode, which
        // spends gas ONLY on closing existing pending calls (no new burn).
        if (!config.resolveOnly) {
          // update flow state (deduped by txHash:logIndex)
          for (const ev of events) {
            if (ev.kind === "transfer" && ev.token && ev.from && ev.to && ev.value !== undefined) {
              state.recordFlow(ev.token, ev.from, ev.to, ev.value, ev.ts, `${ev.txHash}:${ev.logIndex}`);
            }
          }

          // per-event detectors (whaleFlow / newWallet / abnormalLiquidity)
          for (const ev of events) {
            broadcast({ kind: "thinking", block: bn.toString(), evKind: ev.kind, subject: ev.token ?? ev.pool });
            const signals = runDetectors(ev, {
              state, liquidityBaseline, interactionBaseline, now,
              interactionCount: () => 0, // contract spike handled per-block below
            });
            for (const s of signals) await publish(s, now);
          }

          // contract-interaction spike: evaluate ONCE per contract for this block
          for (const [contract, count] of interactions) {
            broadcast({ kind: "thinking", block: bn.toString(), evKind: "call", subject: contract });
            const ev: ChainEvent = { blockNumber: bn, txHash: "0x0", logIndex: -1, kind: "call", contract: contract as `0x${string}`, ts };
            const sig = contractInteractionSpike(interactionBaseline, ev, count);
            if (sig) await publish(sig, now);
          }
        }

        // resolve due calls (skips "unresolvable" => stays pending)
        if (resolver.configured) {
          const resolved = await resolver.resolveDue(pending, now);
          if (resolved.length) {
            for (const id of resolved) {
              const i = pending.findIndex((p) => p.id === id);
              if (i >= 0) pending.splice(i, 1);
              broadcast({ kind: "resolved", id });
            }
            savePending(pending);                           // persist after closures
          }
        }

        cursor = bn;
        saveCursor(cursor); // per-block durability: a crash replays at most one block
      }
      backoff = POLL_MS;
      await sleep(POLL_MS);
    } catch (e) {
      broadcast({ kind: "degraded", reason: String(e) });
      await sleep(backoff);
      backoff = Math.min(backoff * 2, 60000);
    }
  }
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
main();
