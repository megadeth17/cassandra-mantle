import type { Call } from "../lib/useSignals";
import { TYPE_LABEL } from "../lib/chain";

const ICONS = ["◆", "◇", "◈", "⬡"];

export function DetectorBreakdown({ calls }: { calls: Call[] }) {
  const detectors = TYPE_LABEL.map((label, type) => {
    const total = calls.filter((c) => c.type === type).length;
    const resolved = calls.filter((c) => c.type === type && c.status !== 0);
    const hits = resolved.filter((c) => c.status === 1).length;
    const rate = resolved.length
      ? Math.round((hits / resolved.length) * 100)
      : null;
    return { label, total, hits, resolved: resolved.length, rate };
  });

  return (
    <section
      className="max-w-4xl mx-auto px-6 mb-16 fade-up"
      style={{ animationDelay: "0.25s" }}
    >
      <h2 className="font-mono text-xs tracking-[0.2em] text-oracle/60 uppercase mb-4">
        Detection Matrix
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger">
        {detectors.map((d, i) => (
          <div
            key={d.label}
            className="panel p-4 hover:border-oracle/25 transition-all duration-300 group"
          >
            <div className="text-oracle/40 text-lg mb-2 group-hover:text-oracle transition-colors duration-300">
              {ICONS[i]}
            </div>
            <div className="font-display text-2xl text-ink mb-0.5">
              {d.rate !== null ? `${d.rate}%` : "—"}
            </div>
            <div className="font-mono text-[10px] text-ink-dim leading-tight">
              {d.label}
            </div>
            <div className="font-mono text-[10px] text-ink-dim/50 mt-1.5">
              {d.total} signals · {d.hits}/{d.resolved} hit
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
