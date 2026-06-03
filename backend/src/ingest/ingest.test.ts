import { describe, it, expect } from "vitest";
import { decodeLog } from "./ingest.js";

describe("decodeLog", () => {
  it("decodes an ERC-20 Transfer log into a ChainEvent", () => {
    const log = {
      address: "0x0000000000000000000000000000000000000Tok",
      topics: [
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
        "0x000000000000000000000000000000000000000000000000000000000000aaaa",
        "0x000000000000000000000000000000000000000000000000000000000000bbbb",
      ] as `0x${string}`[],
      data: "0x0000000000000000000000000000000000000000000000000000000000000064", // 100
      blockNumber: 12n,
      transactionHash: "0xtx" as `0x${string}`,
      logIndex: 3,
    };
    const ev = decodeLog(log as any, 1700000000);
    expect(ev?.kind).to.equal("transfer");
    expect(ev?.value).to.equal(100n);
    expect(ev?.logIndex).to.equal(3);
  });
});
