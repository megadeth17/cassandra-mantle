import type { ChainEvent, Signal } from "@shared/types";
import type { RollingBaseline } from "../engine/baseline.js";
import { clampScore, signalId } from "./util.js";

const Z_THRESHOLD = 3; // 3 stddev band
const MIN_SAMPLES = 10;

export function abnormalLiquidity(baseline: RollingBaseline, ev: ChainEvent): Signal | null {
  if (ev.kind !== "sync" || !ev.pool || ev.reserve0 === undefined) return null;
  const key = ev.pool;
  const reserve = Number(ev.reserve0);
  const { mean, std, n } = baseline.stats(key);
  baseline.push(key, reserve); // update after reading baseline
  if (n < MIN_SAMPLES) return null;
  // std=0 means perfectly stable baseline; any deviation is extreme
  if (std === 0) {
    if (reserve === mean) return null;
    const direction = reserve < mean ? "bearish" : "bullish";
    const score = clampScore(100);
    return {
      id: signalId("abnormal_liquidity", ev.pool, ev.blockNumber),
      type: "abnormal_liquidity",
      subject: ev.pool,
      direction,
      score,
      evidence: { reserve, mean, std: 0, z: Infinity, txHash: ev.txHash },
      blockNumber: ev.blockNumber,
      ts: ev.ts,
      priceToken: ev.pool,
    };
  }
  const z = (reserve - mean) / std;
  if (Math.abs(z) < Z_THRESHOLD) return null;
  const direction = z < 0 ? "bearish" : "bullish";
  const score = clampScore(60 + Math.min(Math.abs(z) - Z_THRESHOLD, 4) * 10);
  return {
    id: signalId("abnormal_liquidity", ev.pool, ev.blockNumber),
    type: "abnormal_liquidity",
    subject: ev.pool,
    direction,
    score,
    evidence: { reserve, mean, std, z, txHash: ev.txHash },
    blockNumber: ev.blockNumber,
    ts: ev.ts,
    priceToken: ev.pool,
  };
}
