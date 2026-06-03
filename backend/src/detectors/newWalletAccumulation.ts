import type { ChainEvent, Signal } from "@shared/types";
import type { RollingState } from "../engine/state.js";
import { clampScore, signalId } from "./util.js";

const NEW_WALLET_MAX_AGE_SEC = 6 * 3600; // "new" = first seen within 6h
const MIN_NET = 0n;

export function newWalletAccumulation(state: RollingState, ev: ChainEvent, now: number): Signal | null {
  if (ev.kind !== "transfer" || !ev.token || !ev.to) return null;
  const firstSeen = state.firstSeen(ev.to);
  if (firstSeen === undefined) return null;
  const age = now - firstSeen;
  if (age > NEW_WALLET_MAX_AGE_SEC) return null;
  const net = state.netInflow(ev.token, ev.to);
  if (net <= MIN_NET) return null;
  // younger wallet + larger net = higher score
  const freshness = 1 - age / NEW_WALLET_MAX_AGE_SEC; // 0..1
  const score = clampScore(50 + freshness * 40);
  return {
    id: signalId("new_wallet_accumulation", ev.to, ev.blockNumber),
    type: "new_wallet_accumulation",
    subject: ev.to,
    direction: "bullish",
    score,
    evidence: { token: ev.token, ageSec: age, netInflow: net.toString(), txHash: ev.txHash },
    blockNumber: ev.blockNumber,
    ts: ev.ts,
  };
}
