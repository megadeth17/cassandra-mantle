import type { Direction, SignalStatus } from "@shared/types";

/** threshold is a fraction, e.g. 0.05 = 5% move required to count. */
export function decideOutcome(
  dir: Direction,
  priceAt: number,
  priceAfter: number,
  threshold: number,
): Exclude<SignalStatus, "pending"> {
  const change = (priceAfter - priceAt) / priceAt;
  if (dir === "bullish") return change >= threshold ? "hit" : "miss";
  if (dir === "bearish") return change <= -threshold ? "hit" : "miss";
  return Math.abs(change) >= threshold ? "hit" : "miss"; // neutral = volatility call
}
