import type { Direction } from "@shared/types";

export type Outcome = "hit" | "miss" | "unresolvable";

/** threshold is a fraction, e.g. 0.05 = 5% move required to count.
 *  Returns "unresolvable" when prices are missing/zero/non-finite so the caller
 *  leaves the call PENDING instead of writing a false outcome on-chain. */
export function decideOutcome(dir: Direction, priceAt: number, priceAfter: number, threshold: number): Outcome {
  if (!priceAt || !isFinite(priceAt) || !isFinite(priceAfter)) return "unresolvable";
  const change = (priceAfter - priceAt) / priceAt;
  if (dir === "bullish") return change >= threshold ? "hit" : "miss";
  if (dir === "bearish") return change <= -threshold ? "hit" : "miss";
  return Math.abs(change) >= threshold ? "hit" : "miss"; // neutral = volatility call
}
