import { describe, it, expect } from "vitest";
import { decideOutcome } from "./outcome.js";

describe("decideOutcome", () => {
  it("bullish call is a hit when price rises beyond threshold", () => {
    expect(decideOutcome("bullish", 100, 106, 0.05)).to.equal("hit");
  });
  it("bullish call is a miss when price falls", () => {
    expect(decideOutcome("bullish", 100, 99, 0.05)).to.equal("miss");
  });
  it("bearish call is a hit when price falls beyond threshold", () => {
    expect(decideOutcome("bearish", 100, 94, 0.05)).to.equal("hit");
  });
  it("neutral call is a hit when volatility exceeds threshold either way", () => {
    expect(decideOutcome("neutral", 100, 108, 0.05)).to.equal("hit");
    expect(decideOutcome("neutral", 100, 100.5, 0.05)).to.equal("miss");
  });
});
