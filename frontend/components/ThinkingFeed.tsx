"use client";
import { useSSE } from "../lib/useSSE";

const FEED_URL = process.env.NEXT_PUBLIC_FEED_URL ?? "http://localhost:8787/feed";

export function ThinkingFeed() {
  const events = useSSE(FEED_URL);
  if (events.length === 0) return null;
  return (
    <section className="max-w-4xl mx-auto px-4 mb-12">
      <h2 className="font-mono text-ink-dim text-xs tracking-widest mb-2">CASSANDRA IS WATCHING</h2>
      <div className="font-mono text-xs space-y-1">
        {events.map((e, i) => (
          <div key={i} className="text-ink-dim" style={{ opacity: 1 - i * 0.06 }}>
            {e.kind === "thinking" && <>· block {e.block} · {e.evKind} · {e.subject}</>}
            {e.kind === "signal" && <span className="text-oracle-glow">▲ SIGNAL {e.signal?.type} · score {e.signal?.score} · tx {String(e.tx).slice(0, 10)}…</span>}
            {e.kind === "signal-dry" && <span className="text-oracle">▲ SIGNAL (dry) {e.signal?.type} · score {e.signal?.score}</span>}
            {e.kind === "resolved" && <span className="text-hit">✓ resolved {e.id}</span>}
            {e.kind === "degraded" && <span className="text-miss">feed degraded: {e.reason}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
