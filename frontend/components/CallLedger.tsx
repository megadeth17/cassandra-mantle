import type { Call } from "../lib/useSignals";
import { TYPE_LABEL, DIR_LABEL, STATUS_LABEL, EXPLORER } from "../lib/chain";

const STATUS_STYLE: Record<number, string> = {
  0: "bg-pending/10 text-pending border-pending/20",
  1: "bg-hit/10 text-hit border-hit/20",
  2: "bg-miss/10 text-miss border-miss/20",
};

export function CallLedger({ calls }: { calls: Call[] }) {
  if (calls.length === 0) {
    return (
      <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <p className="font-mono text-sm text-ink-dim">
          No signals recorded yet.
        </p>
      </section>
    );
  }

  return (
    <section
      className="max-w-4xl mx-auto px-6 pb-24 fade-up"
      style={{ animationDelay: "0.35s" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-mono text-xs tracking-[0.2em] text-oracle/60 uppercase">
          The Ledger
        </h2>
        <span className="font-mono text-[10px] text-ink-dim/50">
          {calls.length} signals
        </span>
      </div>
      <div className="panel overflow-hidden">
        <div className="divide-y divide-oracle/[0.06]">
          {calls.map((c) => (
            <div
              key={c.id}
              className="px-4 py-3 hover:bg-oracle/[0.03] transition-colors flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display text-sm text-ink">
                    {TYPE_LABEL[c.type]}
                  </span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${STATUS_STYLE[c.status]}`}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-ink-dim mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span>
                    {c.subject.slice(0, 6)}…{c.subject.slice(-4)}
                  </span>
                  <span className="text-oracle/20">·</span>
                  <span>{DIR_LABEL[c.direction]}</span>
                  <span className="text-oracle/20">·</span>
                  <span>score {c.score}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono text-[10px] text-ink-dim">
                  {new Date(c.ts * 1000).toLocaleDateString("en", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="font-mono text-[10px] text-ink-dim/40">
                  {new Date(c.ts * 1000).toLocaleTimeString("en", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
