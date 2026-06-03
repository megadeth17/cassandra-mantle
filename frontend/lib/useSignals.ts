"use client";
import { useEffect, useState } from "react";
import { publicClient, REGISTRY } from "./chain";
import { REGISTRY_EVENTS_ABI } from "./registryAbi";

export interface Call {
  id: string;
  type: number;
  subject: string;
  direction: number;
  score: number;
  ts: number;
  status: number;
  resolvedTs?: number;
}

const MOCK: Call[] = [
  {
    id: "whale_flow:0xabc:100",
    type: 0,
    subject: "0xabc...beef",
    direction: 0,
    score: 88,
    ts: 1700000000,
    status: 1,
  },
  {
    id: "abnormal_liquidity:0xpool:140",
    type: 2,
    subject: "0xpool...d00d",
    direction: 1,
    score: 74,
    ts: 1700003600,
    status: 0,
  },
];

export function useSignals() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!REGISTRY) throw new Error("no registry configured");
        const submitted = await publicClient.getLogs({
          address: REGISTRY,
          event: REGISTRY_EVENTS_ABI[0],
          fromBlock: BigInt(0),
        });
        const resolved = await publicClient.getLogs({
          address: REGISTRY,
          event: REGISTRY_EVENTS_ABI[1],
          fromBlock: BigInt(0),
        });

        const map = new Map<string, Call>();

        for (const l of submitted) {
          const a = l.args as any;
          map.set(a.id, {
            id: a.id,
            type: a.signalType,
            subject: a.subject,
            direction: a.direction,
            score: a.score,
            ts: Number(a.ts),
            status: 0,
          });
        }

        for (const l of resolved) {
          const a = l.args as any;
          const c = map.get(a.id);
          if (c) {
            c.status = a.status;
            c.resolvedTs = Number(a.ts);
          }
        }

        if (active)
          setCalls(Array.from(map.values()).sort((x, y) => y.ts - x.ts));
      } catch {
        if (active) setCalls(MOCK); // standalone demo without live chain
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { calls, loading };
}
