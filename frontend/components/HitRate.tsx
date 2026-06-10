import type { Call } from "../lib/useSignals";

export function HitRate({ calls }: { calls: Call[] }) {
  const resolved = calls.filter((c) => c.status !== 0);
  const hits = resolved.filter((c) => c.status === 1).length;
  const misses = resolved.filter((c) => c.status === 2).length;
  const pending = calls.filter((c) => c.status === 0).length;
  const rate = resolved.length ? Math.round((hits / resolved.length) * 100) : 0;

  const size = 200;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;

  return (
    <section
      className="flex flex-col items-center py-10 px-6 fade-up"
      style={{ animationDelay: "0.15s" }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(201, 162, 39, 0.08)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#oracleGrad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="ring-animated"
            style={
              {
                "--ring-circumference": circumference,
                "--ring-offset": offset,
              } as React.CSSProperties
            }
          />
          <defs>
            <linearGradient id="oracleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#c9a227" />
              <stop offset="100%" stopColor="#e8c44d" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-display text-oracle-glow oracle-glow"
            style={{ fontSize: "3.5rem", lineHeight: 1 }}
          >
            {rate}%
          </span>
          <span className="font-mono text-[10px] tracking-[0.2em] text-ink-dim uppercase mt-1">
            hit rate
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6 mt-6 font-mono text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-hit" />
          <span className="text-ink-dim">{hits} hits</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-miss" />
          <span className="text-ink-dim">{misses} misses</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-pending" />
          <span className="text-ink-dim">{pending} pending</span>
        </div>
      </div>

      <p className="font-mono text-xs text-ink-dim/60 mt-2">
        {calls.length} total signals on-chain
      </p>
    </section>
  );
}
