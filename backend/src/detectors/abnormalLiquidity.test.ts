import { describe, it, expect } from "vitest";
import { RollingBaseline } from "../engine/baseline.js";
import { abnormalLiquidity } from "./abnormalLiquidity.js";
import type { ChainEvent } from "@shared/types";

describe("abnormalLiquidity", () => {
  it("fires bearish when reserves drop beyond the stddev band (rug-like)", () => {
    const b = new RollingBaseline(20);
    for (let i = 0; i < 20; i++) b.push("0xpool", 1000); // stable reserve ~1000
    const ev: ChainEvent = { blockNumber: 5n, txHash: "0x5", logIndex: 0, kind: "sync",
      pool: "0xpool", reserve0: 200n, reserve1: 0n, ts: 5000 };
    const sig = abnormalLiquidity(b, ev);
    expect(sig).not.toBeNull();
    expect(sig!.direction).to.equal("bearish");
    expect(sig!.type).to.equal("abnormal_liquidity");
  });

  it("returns null for a normal reserve wobble", () => {
    const b = new RollingBaseline(20);
    for (let i = 0; i < 20; i++) b.push("0xpool", 1000 + (i % 3));
    const ev: ChainEvent = { blockNumber: 5n, txHash: "0x5", logIndex: 0, kind: "sync",
      pool: "0xpool", reserve0: 1001n, reserve1: 0n, ts: 5000 };
    expect(abnormalLiquidity(b, ev)).toBeNull();
  });
});
