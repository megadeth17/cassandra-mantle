import type { Call } from "../lib/useSignals";
import { TYPE_LABEL, DIR_LABEL, STATUS_LABEL, EXPLORER } from "../lib/chain";

const STATUS_CLASS = ["text-pending", "text-hit", "text-miss"];

export function CallLedger({ calls }: { calls: Call[] }) {
  return (
    <section className="max-w-4xl mx-auto px-4 pb-24">
      <h2 className="font-display text-2xl text-ink mb-4 border-b border-oracle/30 pb-2">The Ledger</h2>
      <ul className="space-y-2">
        {calls.map((c) => (
          <li key={c.id} className="grid grid-cols-[1fr_auto] gap-3 items-center bg-surface-panel/60 border border-oracle/15 rounded px-4 py-3 hover:border-oracle/50 transition-colors">
            <div>
              <span className="font-display text-ink">{TYPE_LABEL[c.type]}</span>
              <span className="font-mono text-ink-dim text-xs ml-2">{c.subject}</span>
              <div className="font-mono text-xs text-ink-dim">{DIR_LABEL[c.direction]} · score {c.score} · {new Date(c.ts * 1000).toUTCString()}</div>
            </div>
            <span className={`font-mono text-sm ${STATUS_CLASS[c.status]}`}>{STATUS_LABEL[c.status]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
