"use client";
import { useEffect, useState } from "react";
import type { AbiEvent } from "viem";
import { publicClient, REGISTRY, FROM_BLOCK } from "./chain";
import { REGISTRY_EVENTS_ABI } from "./registryAbi";

// Public Mantle RPC caps eth_getLogs at a 10k-block span per call, so we page
// the full registry history in safe windows and aggregate. Without this the
// dashboard silently reads nothing (the deploy block is ~280k blocks back).
const LOG_WINDOW = 9000n;

async function getLogsPaged<TEvent extends AbiEvent>(
  event: TEvent,
  from: bigint,
  to: bigint,
): Promise<Array<{ args: any }>> {
  const out: Array<{ args: any }> = [];
  for (let start = from; start <= to; start += LOG_WINDOW) {
    const end = start + LOG_WINDOW - 1n > to ? to : start + LOG_WINDOW - 1n;
    const logs = await publicClient.getLogs({
      address: REGISTRY,
      event,
      fromBlock: start,
      toBlock: end,
    });
    out.push(...(logs as Array<{ args: any }>));
  }
  return out;
}

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

export function useSignals() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!REGISTRY) throw new Error("no registry configured");
        const head = await publicClient.getBlockNumber();
        const submitted = await getLogsPaged(REGISTRY_EVENTS_ABI[0], FROM_BLOCK, head);
        const resolved = await getLogsPaged(REGISTRY_EVENTS_ABI[1], FROM_BLOCK, head);

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

        if (active) {
          setCalls(Array.from(map.values()).sort((x, y) => y.ts - x.ts));
          setError(null);
        }
      } catch (e) {
        // No mock fallback: the thesis is that the record can't be faked, so a
        // read failure surfaces an honest empty + error state, never fake rows.
        if (active) {
          setCalls([]);
          setError(e instanceof Error ? e.message : "failed to read registry");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { calls, loading, error };
}
