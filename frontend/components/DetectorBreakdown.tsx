"use client";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import type { Call } from "../lib/useSignals";
import { TYPE_LABEL } from "../lib/chain";

export function DetectorBreakdown({ calls }: { calls: Call[] }) {
  const data = TYPE_LABEL.map((label, type) => {
    const r = calls.filter((c) => c.type === type && c.status !== 0);
    const hits = r.filter((c) => c.status === 1).length;
    return { label, rate: r.length ? Math.round((hits / r.length) * 100) : 0, n: r.length };
  });
  return (
    <section className="max-w-4xl mx-auto px-4 mb-12">
      <h2 className="font-display text-2xl text-ink mb-4">Hit-rate by detector</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <XAxis dataKey="label" tick={{ fill: "#8fa399", fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fill: "#8fa399", fontSize: 11 }} />
          <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill="#c9a227" />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
