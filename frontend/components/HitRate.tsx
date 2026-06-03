import type { Call } from "../lib/useSignals";

export function HitRate({ calls }: { calls: Call[] }) {
  const resolved = calls.filter((c) => c.status !== 0);
  const hits = resolved.filter((c) => c.status === 1).length;
  const rate = resolved.length ? Math.round((hits / resolved.length) * 100) : 0;
  return (
    <section className="text-center py-16">
      <p className="font-mono text-ink-dim tracking-widest text-sm">PROVABLE HIT-RATE</p>
      <p className="font-display text-oracle-glow" style={{ fontSize: "clamp(4rem,12vw,9rem)", lineHeight: 1 }}>{rate}%</p>
      <p className="font-mono text-ink-dim text-sm">{hits} hits / {resolved.length} resolved · {calls.length} total calls on-chain</p>
    </section>
  );
}
