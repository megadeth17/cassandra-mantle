"use client";
import type { Call } from "../lib/useSignals";
import { useLedger, type LedgerStatus } from "../lib/useLedger";
import { useSSE } from "../lib/useSSE";

const FEED_URL = process.env.NEXT_PUBLIC_FEED_URL ?? "http://localhost:8787/feed";

const FILTERS: { key: "all" | LedgerStatus; label: string }[] = [
  { key: "all", label: "All calls" },
  { key: "hit", label: "Hits" },
  { key: "miss", label: "Misses" },
  { key: "pending", label: "Pending" },
];

function ThinkingStrip() {
  const events = useSSE(FEED_URL);
  if (events.length === 0) return null;
  return (
    <div className="thinking reveal">
      <div className="th-head">
        <span className="th-dot" />
        <h4>Cassandra is watching · live</h4>
      </div>
      <div className="th-body">
        {events.map((e, i) => (
          <div className="th-row" key={i} style={{ opacity: Math.max(0.25, 1 - i * 0.07) }}>
            {e.kind === "thinking" && (
              <span className="g">› block {e.block} · {e.evKind} · {e.subject}</span>
            )}
            {e.kind === "signal" && (
              <span className="sig">▲ SIGNAL {e.signal?.type} · score {e.signal?.score} · tx {String(e.tx).slice(0, 10)}…</span>
            )}
            {e.kind === "signal-dry" && (
              <span className="sig">▲ SIGNAL (dry) {e.signal?.type} · score {e.signal?.score}</span>
            )}
            {e.kind === "resolved" && <span className="res">✓ resolved {e.id}</span>}
            {e.kind === "degraded" && <span className="deg">✗ feed degraded: {e.reason}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LiveLedger({ calls, loading }: { calls: Call[]; loading: boolean }) {
  const { rows, isEmpty, filter, setFilter, blockNo, hits, resolved, total } = useLedger(calls, loading);
  const shown = rows.slice(0, 12);

  return (
    <div className="ledger-wrap reveal">
      <div className="ledger-top">
        <div className="filters">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`filter${filter === f.key ? " active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="live-pill">
          <span className="live-dot" />
          Streaming from registry
        </span>
      </div>

      {isEmpty ? (
        <div className="ledger" style={{ padding: "48px 24px", textAlign: "center" }}>
          <p style={{ color: "var(--ink-2)", fontSize: 14, margin: 0 }}>
            The registry is awaiting its first live call.
          </p>
          <p style={{ color: "var(--ink-3, #6b7280)", fontSize: 12, marginTop: 8 }}>
            Every signal Cassandra inscribes will appear here — read straight from
            Mantle, never seeded. <a href="https://mantlescan.xyz" target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold, #C9A227)" }}>Verify on Mantlescan ↗</a>
          </p>
        </div>
      ) : (
      <div className="ledger">
        <div className="ledger-h">
          <span>Detector</span><span>Signal</span><span>Subject</span>
          <span>Score</span><span>Outcome</span><span>Status</span>
        </div>
        <div>
          {shown.map((r) => (
            <a
              key={r.id}
              className="ledger-row"
              href={r.href}
              target="_blank"
              rel="noopener noreferrer"
              style={r.isNew ? { background: "rgba(201,162,39,.06)" } : undefined}
            >
              <div className="l-type">
                <span className="tdot" style={{ background: r.detColor }} />
                <span className="tt">{r.detLabel}</span>
              </div>
              <div className="l-type">
                <span className="tt" style={{ color: "var(--ink-2)" }}>{r.signal}</span>
              </div>
              <div className="l-subj">{r.subj}<small>{r.subjFull}</small></div>
              <div className="l-score">{r.score}</div>
              <div><span className={`l-out ${r.outcome.cls}`}>{r.outcome.text}</span></div>
              <div>
                <span className={`chip ${r.status}`}>
                  <span className="cd" />
                  {r.status === "hit" ? "Hit" : r.status === "miss" ? "Miss" : "Pending"}
                </span>
              </div>
            </a>
          ))}
        </div>
        <div className="ledger-foot">
          <span>{shown.length} of {total} shown · {hits}/{resolved} resolved as hits</span>
          <span>Block {blockNo.toLocaleString()} · Mantle mainnet</span>
        </div>
      </div>
      )}

      <ThinkingStrip />
    </div>
  );
}
