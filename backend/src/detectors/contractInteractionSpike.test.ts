import { describe, it, expect } from "vitest";
import { RollingBaseline } from "../engine/baseline.js";
import { contractInteractionSpike } from "./contractInteractionSpike.js";
import type { ChainEvent } from "@shared/types";

describe("contractInteractionSpike", () => {
  it("fires when per-block interaction count jumps past baseline", () => {
    const b = new RollingBaseline(20);
    for (let i = 0; i < 20; i++) b.push("0xc", 2); // ~2 calls/block baseline
    const ev: ChainEvent = { blockNumber: 7n, txHash: "0x7", logIndex: 0, kind: "call",
      contract: "0xc", ts: 7000 };
    const sig = contractInteractionSpike(b, ev, 30); // 30 calls this block
    expect(sig).not.toBeNull();
    expect(sig!.type).to.equal("contract_interaction_spike");
    expect(sig!.direction).to.equal("neutral");
  });

  it("returns null for a normal block", () => {
    const b = new RollingBaseline(20);
    for (let i = 0; i < 20; i++) b.push("0xc", 5);
    const ev: ChainEvent = { blockNumber: 7n, txHash: "0x7", logIndex: 0, kind: "call",
      contract: "0xc", ts: 7000 };
    expect(contractInteractionSpike(b, ev, 6)).toBeNull();
  });
});
