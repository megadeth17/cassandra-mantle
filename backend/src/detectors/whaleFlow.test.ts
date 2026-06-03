import { describe, it, expect } from "vitest";
import { RollingState } from "../engine/state.js";
import { whaleFlow } from "./whaleFlow.js";
import type { ChainEvent } from "@shared/types";

function transfer(to: string, value: bigint, ts: number): ChainEvent {
  return { blockNumber: 1n, txHash: "0x1", logIndex: 0, kind: "transfer",
    token: "0xtok", from: "0xsrc", to: to as `0x${string}`, value, ts };
}

describe("whaleFlow", () => {
  it("fires bullish when net inflow is a top-percentile move", () => {
    const s = new RollingState({ windowSec: 3600 });
    for (let i = 0; i < 20; i++) s.recordFlow("0xtok", "0xsrc", `0xw${i}`, 10n, 1000 + i);
    const ev = transfer("0xbig", 5000n, 2000);
    s.recordFlow(ev.token!, ev.from!, ev.to!, ev.value!, ev.ts);
    const sig = whaleFlow(s, ev);
    expect(sig).not.toBeNull();
    expect(sig!.type).to.equal("whale_flow");
    expect(sig!.direction).to.equal("bullish");
    expect(sig!.score).to.be.greaterThan(70);
  });

  it("returns null for an ordinary-sized transfer", () => {
    const s = new RollingState({ windowSec: 3600 });
    for (let i = 0; i < 20; i++) s.recordFlow("0xtok", "0xsrc", `0xw${i}`, 100n, 1000 + i);
    const ev = transfer("0xsmall", 90n, 2000);
    s.recordFlow(ev.token!, ev.from!, ev.to!, ev.value!, ev.ts);
    expect(whaleFlow(s, ev)).toBeNull();
  });
});
