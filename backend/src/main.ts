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
import { startSSE, broadcast } from "./sse.js";
import type { ChainEvent, Signal } from "@shared/types";

const POLL_MS = 5000;

const priceOf = priceForSubject;

async function main() {
  const state = new RollingState({ windowSec: 24 * 3600 });
  const liquidityBaseline = new RollingBaseline(50);
  const interactionBaseline = new RollingBaseline(50);
  const cooldown = new Cooldown(3600);
  const publisher = makePublisher();
  const bot = makeBot();
  const pending: PendingCall[] = [];
  const resolver = makeResolver(priceOf);

  if (bot.configured) bot.start();
  startSSE();

  let cursor = config.startBlock === "latest" ? await client.getBlockNumber() : loadCursor(BigInt(config.startBlock));
  let backoff = POLL_MS;

  async function publish(s: Signal, now: number) {
    if (!cooldown.allow(s.type, s.subject, s.ts)) return;
    if (!publisher.configured) {
      broadcast({ kind: "signal-dry", signal: { ...s, blockNumber: s.blockNumber.toString() } });
      return;
    }
    try {
      const tx = await publisher.submit(s);                 // on-chain FIRST
      const priceAt = s.priceToken ? await priceOf(s.priceToken) : 0;
      pending.push({ id: s.id, type: s.type, direction: s.direction, subject: s.subject, submittedAt: s.ts, priceAt, priceToken: s.priceToken });
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

        // resolve due calls (skips "unresolvable" => stays pending)
        if (resolver.configured) {
          const resolved = await resolver.resolveDue(pending, now);
          for (const id of resolved) {
            const i = pending.findIndex((p) => p.id === id);
            if (i >= 0) pending.splice(i, 1);
            broadcast({ kind: "resolved", id });
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
