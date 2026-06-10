"use client";
import { useSSE } from "../lib/useSSE";

const FEED_URL =
  process.env.NEXT_PUBLIC_FEED_URL ?? "http://localhost:8787/feed";

export function ThinkingFeed() {
  const events = useSSE(FEED_URL);
  if (events.length === 0) return null;

  return (
    <section className="max-w-4xl mx-auto px-6 mb-16">
      <div className="panel p-4 oracle-glow-box">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-oracle pulse-live" />
          <h2 className="font-mono text-[10px] tracking-[0.2em] text-oracle/60 uppercase">
            Cassandra is watching
          </h2>
        </div>
        <div className="font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
          {events.map((e, i) => (
            <div
              key={i}
              className="transition-opacity"
              style={{ opacity: Math.max(0.15, 1 - i * 0.08) }}
            >
              {e.kind === "thinking" && (
                <span className="text-ink-dim">
                  <span className="text-oracle/30 mr-1">›</span>
                  block {e.block} · {e.evKind} · {e.subject}
                </span>
              )}
              {e.kind === "signal" && (
                <span className="text-oracle-glow">
                  <span className="text-oracle mr-1">▲</span>
                  SIGNAL {e.signal?.type} · score {e.signal?.score} · tx{" "}
                  {String(e.tx).slice(0, 10)}…
                </span>
              )}
              {e.kind === "signal-dry" && (
                <span className="text-oracle/60">
                  <span className="text-oracle/30 mr-1">▲</span>
                  SIGNAL (dry) {e.signal?.type} · score {e.signal?.score}
                </span>
              )}
              {e.kind === "resolved" && (
                <span className="text-hit">
                  <span className="text-hit/50 mr-1">✓</span>
                  resolved {e.id}
                </span>
              )}
              {e.kind === "degraded" && (
                <span className="text-miss">
                  <span className="text-miss/50 mr-1">✗</span>
                  feed degraded: {e.reason}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
