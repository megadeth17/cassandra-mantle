import { describe, it, expect } from "vitest";
import { hashEvidence, signalTypeIndex, directionIndex } from "./registry.js";

describe("registry encoding", () => {
  it("hashes evidence deterministically", () => {
    const h1 = hashEvidence({ a: 1, b: "x" });
    const h2 = hashEvidence({ b: "x", a: 1 }); // key order independent
    expect(h1).to.equal(h2);
    expect(h1).to.match(/^0x[0-9a-f]{64}$/);
  });
  it("maps signal type + direction to contract enum indexes", () => {
    expect(signalTypeIndex("whale_flow")).to.equal(0);
    expect(signalTypeIndex("contract_interaction_spike")).to.equal(3);
    expect(directionIndex("bullish")).to.equal(0);
    expect(directionIndex("neutral")).to.equal(2);
  });
});
