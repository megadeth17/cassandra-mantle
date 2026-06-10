import type { ChainEvent, Signal } from "@shared/types";
import type { RollingState } from "../engine/state.js";
import { clampScore, percentile, signalId } from "./util.js";

const NEW_WALLET_MAX_AGE_SEC = 6 * 3600; // "new" = first seen within 6h
const MIN_NET = 0n;
const ACCUM_PCTILE = 0.85; // the inflow must rank in the top 15% of recent flows
const MIN_SAMPLES = 10;

export function newWalletAccumulation(state: RollingState, ev: ChainEvent, now: number): Signal | null {
  if (ev.kind !== "transfer" || !ev.token || !ev.to || ev.value === undefined) return null;
  const firstSeen = state.firstSeen(ev.to);
  if (firstSeen === undefined) return null;
  const age = now - firstSeen;
  if (age > NEW_WALLET_MAX_AGE_SEC) return null;
  const net = state.netInflow(ev.token, ev.to);
  if (net <= MIN_NET) return null;

  // Require a SIGNIFICANT inflow, not merely a positive one. A fresh wallet
  // receiving a top-percentile transfer is deliberate accumulation worth a
  // call; a fresh wallet receiving dust / a routine CEX withdrawal is noise.
  // Gating on magnitude is what keeps this detector (and its gas) honest.
  const recent = state.recentFlows(ev.token);
  if (recent.length < MIN_SAMPLES) return null;
  const p = percentile(recent, ev.value);
  if (p < ACCUM_PCTILE) return null;

  const freshness = 1 - age / NEW_WALLET_MAX_AGE_SEC; // 0..1
  const magnitude = (p - ACCUM_PCTILE) / (1 - ACCUM_PCTILE); // 0..1
  const score = clampScore(60 + freshness * 20 + magnitude * 20); // 60..100
  return {
    id: signalId("new_wallet_accumulation", ev.to, ev.blockNumber),
    type: "new_wallet_accumulation",
    subject: ev.to,
    direction: "bullish",
    score,
    evidence: { token: ev.token, ageSec: age, netInflow: net.toString(), percentile: p, txHash: ev.txHash },
    blockNumber: ev.blockNumber,
    ts: ev.ts,
    priceToken: ev.token,
  };
}
