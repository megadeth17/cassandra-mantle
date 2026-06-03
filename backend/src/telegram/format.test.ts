import { describe, it, expect } from "vitest";
import { formatSignal } from "./format.js";
import type { Signal } from "@shared/types";

const sig: Signal = {
  id: "whale_flow:0xabc:100",
  type: "whale_flow",
  subject: "0xabc" as `0x${string}`,
  direction: "bullish",
  score: 88,
  evidence: { value: "5000" },
  blockNumber: 100n,
  ts: 1700000000,
};

describe("formatSignal", () => {
  it("includes type, score, subject, explorer link and dashboard link", () => {
    const msg = formatSignal(sig, "0xTX", "https://sepolia.mantlescan.xyz", "https://cassandra.app");
    expect(msg).to.include("WHALE FLOW");
    expect(msg).to.include("88");
    expect(msg).to.include("0xabc");
    expect(msg).to.include("https://sepolia.mantlescan.xyz/tx/0xTX");
    expect(msg).to.include("https://cassandra.app");
  });
});
