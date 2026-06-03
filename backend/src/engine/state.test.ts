import { describe, it, expect } from "vitest";
import { RollingState } from "./state.js";

describe("RollingState", () => {
  it("tracks net flow per token in a window and records first-seen wallets", () => {
    const s = new RollingState({ windowSec: 3600 });
    s.recordFlow("0xtok", "0xa", "0xb", 100n, 1000);
    s.recordFlow("0xtok", "0xc", "0xb", 50n, 1100);
    expect(s.netInflow("0xtok", "0xb")).to.equal(150n);
    expect(s.firstSeen("0xb")).to.equal(1000);
  });

  it("evicts events older than the window", () => {
    const s = new RollingState({ windowSec: 100 });
    s.recordFlow("0xtok", "0xa", "0xb", 100n, 1000);
    s.recordFlow("0xtok", "0xa", "0xb", 10n, 1201); // 201s later -> first evicted
    expect(s.netInflow("0xtok", "0xb")).to.equal(10n);
  });

  it("ignores a duplicate flow with the same event key", () => {
    const s = new RollingState({ windowSec: 3600 });
    s.recordFlow("0xtok", "0xa", "0xb", 100n, 1000, "0xtx:0");
    s.recordFlow("0xtok", "0xa", "0xb", 100n, 1000, "0xtx:0"); // same key -> ignored
    expect(s.netInflow("0xtok", "0xb")).to.equal(100n);
  });
});
