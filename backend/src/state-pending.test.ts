import { describe, it, expect, afterEach } from "vitest";
import { existsSync, rmSync, writeFileSync } from "fs";
import { loadPending, savePending } from "./state-pending.js";
import type { PendingCall } from "./resolver/resolver.js";

const TMP = ".pending.test.json";

const sample: PendingCall[] = [
  {
    id: "whale_flow:0xabc:100",
    type: "whale_flow",
    direction: "bullish",
    subject: "0x00000000000000000000000000000000000000ab",
    submittedAt: 1_700_000_000,
    priceAt: 1.2345,
    priceToken: "0x00000000000000000000000000000000000000cd",
  },
  {
    id: "abnormal_liquidity:0xpool:140",
    type: "abnormal_liquidity",
    direction: "bearish",
    subject: "0x00000000000000000000000000000000000000ef",
    submittedAt: 1_700_003_600,
    priceAt: 0.5,
    // priceToken intentionally omitted (optional)
  },
];

afterEach(() => {
  if (existsSync(TMP)) rmSync(TMP);
});

describe("state-pending persistence", () => {
  it("round-trips a pending list through disk", () => {
    savePending(sample, TMP);
    expect(loadPending(TMP)).to.deep.equal(sample);
  });

  it("returns empty when the file does not exist", () => {
    expect(loadPending(".does-not-exist.json")).to.deep.equal([]);
  });

  it("returns empty on corrupt JSON instead of throwing", () => {
    writeFileSync(TMP, "{not json");
    expect(loadPending(TMP)).to.deep.equal([]);
  });

  it("filters out malformed entries", () => {
    writeFileSync(
      TMP,
      JSON.stringify([
        sample[0],
        { id: 123, type: "whale_flow" }, // wrong shape
        { id: "x" }, // missing fields
        sample[1],
      ])
    );
    expect(loadPending(TMP)).to.deep.equal(sample);
  });

  it("returns empty when the JSON is not an array", () => {
    writeFileSync(TMP, JSON.stringify({ id: "nope" }));
    expect(loadPending(TMP)).to.deep.equal([]);
  });
});
