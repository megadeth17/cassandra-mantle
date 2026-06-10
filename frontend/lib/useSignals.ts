"use client";
import { useEffect, useState } from "react";
import type { AbiEvent } from "viem";
import { publicClient, REGISTRY, FROM_BLOCK } from "./chain";
import { REGISTRY_EVENTS_ABI } from "./registryAbi";

// Public Mantle RPC caps eth_getLogs at a 10k-block span per call, so we page
// the full registry history in safe windows and aggregate. Without this the
// dashboard silently reads nothing (the deploy block is ~280k blocks back).
const LOG_WINDOW = 9000n;
const LOG_CONCURRENCY = 3; // parallel windows per event; ×2 events = peak 6 (safe on public RPC)

async function getLogsWindow<TEvent extends AbiEvent>(
  event: TEvent,
  from: bigint,
  to: bigint,
  tries = 3,
): Promise<Array<{ args: any }>> {
  // Retry per window: the public RPC occasionally rate-limits a burst. Without
  // a retry, one transient failure would reject the whole load and the
  // dashboard would silently show nothing.
  for (let attempt = 0; ; attempt++) {
    try {
      const logs = await publicClient.getLogs({ address: REGISTRY, event, fromBlock: from, toBlock: to });
      return logs as Array<{ args: any }>;
    } catch (e) {
      if (attempt >= tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
    }
  }
}

async function getLogsPaged<TEvent extends AbiEvent>(
  event: TEvent,
  from: bigint,
  to: bigint,
): Promise<Array<{ args: any }>> {
  // Page the ~280k-block history in 9k windows, fetched in small parallel
  // batches (sequential paging takes ~20s — bad on camera). Conservative
  // concurrency + per-window retry keeps it both fast and reliable.
  const windows: Array<[bigint, bigint]> = [];
  for (let start = from; start <= to; start += LOG_WINDOW) {
    const end = start + LOG_WINDOW - 1n > to ? to : start + LOG_WINDOW - 1n;
    windows.push([start, end]);
  }
  const out: Array<{ args: any }> = [];
  for (let i = 0; i < windows.length; i += LOG_CONCURRENCY) {
    const batch = windows.slice(i, i + LOG_CONCURRENCY);
    const results = await Promise.all(batch.map(([start, end]) => getLogsWindow(event, start, end)));
    for (const logs of results) out.push(...logs);
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
        const [submitted, resolved] = await Promise.all([
          getLogsPaged(REGISTRY_EVENTS_ABI[0], FROM_BLOCK, head),
          getLogsPaged(REGISTRY_EVENTS_ABI[1], FROM_BLOCK, head),
        ]);

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
