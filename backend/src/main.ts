import { config } from "./config.js";
import { client, fetchEvents } from "./ingest/ingest.js";
import { RollingState } from "./engine/state.js";
import { RollingBaseline } from "./engine/baseline.js";
import { Cooldown } from "./engine/cooldown.js";
import { runDetectors } from "./detectors/index.js";
import { makePublisher } from "./chain/registry.js";
import { makeBot } from "./telegram/bot.js";
import { makeResolver, type PendingCall } from "./resolver/resolver.js";
import { loadCursor, saveCursor } from "./state-cursor.js";
import { startSSE, broadcast } from "./sse.js";

const POLL_MS = 5000;

async function main() {
  const state = new RollingState({ windowSec: 24 * 3600 });
  const liquidityBaseline = new RollingBaseline(50);
  const interactionBaseline = new RollingBaseline(50);
  const cooldown = new Cooldown(3600);
  const publisher = makePublisher();
  const bot = makeBot();
  const pending: PendingCall[] = [];
  const resolver = makeResolver(async (_subject: `0x${string}`) => 0);

  if (bot.configured) bot.start();
  startSSE();

  let cursor =
    config.startBlock === "latest"
      ? await client.getBlockNumber()
      : loadCursor(BigInt(config.startBlock));

  let backoff = POLL_MS;
  const interactionCount = new Map<string, number>();

  for (;;) {
    try {
      const head = await client.getBlockNumber();
      if (head <= cursor) { await sleep(POLL_MS); continue; }
      const to = head;
      const events = await fetchEvents(cursor + 1n, to);
      const now = Math.floor(Date.now() / 1000);

      interactionCount.clear();
      for (const ev of events) {
        if (ev.kind === "transfer" && ev.token && ev.from && ev.to && ev.value !== undefined) {
          state.recordFlow(ev.token, ev.from, ev.to, ev.value, ev.ts);
        }
        if (ev.kind === "call" && ev.contract) {
          interactionCount.set(ev.contract, (interactionCount.get(ev.contract) ?? 0) + 1);
        }
      }

      for (const ev of events) {
        broadcast({ kind: "thinking", block: ev.blockNumber.toString(), evKind: ev.kind, subject: ev.token ?? ev.pool ?? ev.contract });
        const signals = runDetectors(ev, {
          state, liquidityBaseline, interactionBaseline, now,
          interactionCount: (c) => interactionCount.get(c) ?? 0,
        });
        for (const s of signals) {
          if (!cooldown.allow(s.type, s.subject, s.ts)) continue;
          if (publisher.configured) {
            try {
              const tx = await publisher.submit(s);
              pending.push({ id: s.id, type: s.type, direction: s.direction, subject: s.subject, submittedAt: s.ts, priceAt: 0 });
              broadcast({ kind: "signal", signal: { ...s, blockNumber: s.blockNumber.toString() }, tx });
              if (bot.configured) await bot.send(s, tx);
            } catch (e) {
              broadcast({ kind: "degraded", reason: "submit failed", id: s.id });
            }
          } else {
            broadcast({ kind: "signal-dry", signal: { ...s, blockNumber: s.blockNumber.toString() } });
          }
        }
      }

      if (resolver.configured) {
        const resolved = await resolver.resolveDue(pending, now);
        for (const id of resolved) {
          const i = pending.findIndex((p) => p.id === id);
          if (i >= 0) pending.splice(i, 1);
          broadcast({ kind: "resolved", id });
        }
      }

      cursor = to;
      saveCursor(cursor);
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
