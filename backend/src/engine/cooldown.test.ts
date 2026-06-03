import { describe, it, expect } from "vitest";
import { Cooldown } from "./cooldown.js";

describe("Cooldown", () => {
  it("blocks the same subject+type within the cooldown window", () => {
    const c = new Cooldown(3600);
    expect(c.allow("whale_flow", "0xa", 1000)).to.equal(true);
    expect(c.allow("whale_flow", "0xa", 2000)).to.equal(false); // 1000s later
    expect(c.allow("whale_flow", "0xa", 5000)).to.equal(true);  // past 3600s
    expect(c.allow("whale_flow", "0xb", 2000)).to.equal(true);  // different subject
  });
});
