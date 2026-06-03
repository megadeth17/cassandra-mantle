import type { ChainEvent, Signal } from "@shared/types";
import type { RollingBaseline } from "../engine/baseline.js";
import { clampScore, signalId } from "./util.js";

const Z_THRESHOLD = 3;
const MIN_SAMPLES = 10;
const FLAT_SPIKE_MULT = 3; // when std==0 (flat baseline), fire only if count >= mean * this

/** countThisBlock = number of interactions with ev.contract in ev.blockNumber */
export function contractInteractionSpike(
  baseline: RollingBaseline,
  ev: ChainEvent,
  countThisBlock: number
): Signal | null {
  if (ev.kind !== "call" || !ev.contract) return null;
  const key = ev.contract;
  const { mean, std, n } = baseline.stats(key);
  baseline.push(key, countThisBlock);
  if (n < MIN_SAMPLES) return null;

  let z: number;
  if (std === 0) {
    // flat baseline: a z-score is undefined. Use a multiplicative jump instead.
    if (mean <= 0 || countThisBlock < mean * FLAT_SPIKE_MULT) return null;
    z = Z_THRESHOLD + Math.min(countThisBlock / mean - FLAT_SPIKE_MULT, 5);
  } else {
    z = (countThisBlock - mean) / std;
    if (z < Z_THRESHOLD) return null;
  }

  const score = clampScore(55 + Math.min(z - Z_THRESHOLD, 5) * 9);
  return {
    id: signalId("contract_interaction_spike", ev.contract, ev.blockNumber),
    type: "contract_interaction_spike",
    subject: ev.contract,
    direction: "neutral",
    score,
    evidence: { count: countThisBlock, mean, std, z },
    blockNumber: ev.blockNumber,
    ts: ev.ts,
  };
}
