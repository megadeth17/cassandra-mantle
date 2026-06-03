import type { ChainEvent, Signal } from "@shared/types";
import { RollingState } from "../engine/state.js";
import { RollingBaseline } from "../engine/baseline.js";
import { whaleFlow } from "./whaleFlow.js";
import { newWalletAccumulation } from "./newWalletAccumulation.js";
import { abnormalLiquidity } from "./abnormalLiquidity.js";
import { contractInteractionSpike } from "./contractInteractionSpike.js";

export interface DetectorContext {
  state: RollingState;
  liquidityBaseline: RollingBaseline;
  interactionBaseline: RollingBaseline;
  now: number;
  interactionCount: (contract: string) => number;
}

export function runDetectors(ev: ChainEvent, ctx: DetectorContext): Signal[] {
  const out: Signal[] = [];
  const a = whaleFlow(ctx.state, ev); if (a) out.push(a);
  const b = newWalletAccumulation(ctx.state, ev, ctx.now); if (b) out.push(b);
  const c = abnormalLiquidity(ctx.liquidityBaseline, ev); if (c) out.push(c);
  if (ev.kind === "call" && ev.contract) {
    const d = contractInteractionSpike(ctx.interactionBaseline, ev, ctx.interactionCount(ev.contract));
    if (d) out.push(d);
  }
  return out;
}
