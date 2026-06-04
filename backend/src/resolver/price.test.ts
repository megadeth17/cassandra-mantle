import { describe, it, expect } from "vitest";
import { SUBJECT_POOL } from "./price.js";

describe("SUBJECT_POOL", () => {
  it("maps known tokens to a pool address", () => {
    expect(SUBJECT_POOL["0x4515a45337f461a11ff0fe8abf3c606ae5dc00c9"]).to.equal("0x763868612858358f62b05691db82ad35a9b3e110");
    expect(SUBJECT_POOL["0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9"]).to.equal("0x8e3a13418743ab1a98434551937ea687e451b589");
  });
});
