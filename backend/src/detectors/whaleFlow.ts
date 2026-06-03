import type { ChainEvent, Signal } from "@shared/types";
import type { RollingState } from "../engine/state.js";
import { percentile, clampScore, signalId } from "./util.js";

const PCTILE_THRESHOLD = 0.95; // top 5% of recent flows

export function whaleFlow(state: RollingState, ev: ChainEvent): Signal | null {
  if (ev.kind !== "transfer" || !ev.token || !ev.to || ev.value === undefined) return null;
  const recent = state.recentFlows(ev.token);
  if (recent.length < 10) return null; // need a baseline
  const p = percentile(recent, ev.value);
  if (p < PCTILE_THRESHOLD) return null;
  const net = state.netInflow(ev.token, ev.to);
  const direction = net >= 0n ? "bullish" : "bearish";
  const score = clampScore(60 + (p - PCTILE_THRESHOLD) / (1 - PCTILE_THRESHOLD) * 40);
  return {
    id: signalId("whale_flow", ev.to, ev.blockNumber),
    type: "whale_flow",
    subject: ev.to as `0x${string}`,
    direction,
    score,
    evidence: {
      token: ev.token,
      value: ev.value.toString(),
      percentile: p,
      netInflow: net.toString(),
      txHash: ev.txHash,
    },
    blockNumber: ev.blockNumber,
    ts: ev.ts,
  };
}
