import { describe, it, expect } from "vitest";
import { RollingState } from "../engine/state.js";
import { newWalletAccumulation } from "./newWalletAccumulation.js";
import type { ChainEvent } from "@shared/types";

/** Seeds a token baseline of `n` small flows among unrelated wallets so the
 *  detector has ≥10 recent samples and the subject wallet stays fresh. */
function seedBaseline(s: RollingState, token: string, n: number, base: number, val: bigint = 10n) {
  for (let i = 0; i < n; i++) s.recordFlow(token, `0xsrc${i}`, `0xdst${i}`, val, base + i);
}

describe("newWalletAccumulation", () => {
  it("fires when a fresh wallet receives a top-percentile inflow", () => {
    const s = new RollingState({ windowSec: 86400 });
    const now = 100000;
    seedBaseline(s, "0xtok", 12, now - 200);
    const ev: ChainEvent = { blockNumber: 9n, txHash: "0x9", logIndex: 0, kind: "transfer",
      token: "0xtok", from: "0xsrc", to: "0xnew", value: 1000n, ts: now };
    s.recordFlow(ev.token!, ev.from!, ev.to!, ev.value!, ev.ts); // first-seen 0xnew = now
    const sig = newWalletAccumulation(s, ev, now);
    expect(sig).not.toBeNull();
    expect(sig!.type).to.equal("new_wallet_accumulation");
    expect(sig!.direction).to.equal("bullish");
    expect(sig!.score).to.be.greaterThanOrEqual(60);
  });

  it("returns null for a small (non-significant) inflow", () => {
    const s = new RollingState({ windowSec: 86400 });
    const now = 100000;
    seedBaseline(s, "0xtok", 12, now - 200, 1000n); // baseline of large flows
    const ev: ChainEvent = { blockNumber: 9n, txHash: "0x9", logIndex: 0, kind: "transfer",
      token: "0xtok", from: "0xsrc", to: "0xnew", value: 10n, ts: now }; // dust, below baseline
    s.recordFlow(ev.token!, ev.from!, ev.to!, ev.value!, ev.ts);
    expect(newWalletAccumulation(s, ev, now)).toBeNull();
  });

  it("returns null when the token has too little baseline", () => {
    const s = new RollingState({ windowSec: 86400 });
    const now = 100000;
    const ev: ChainEvent = { blockNumber: 9n, txHash: "0x9", logIndex: 0, kind: "transfer",
      token: "0xtok", from: "0xsrc", to: "0xnew", value: 1000n, ts: now };
    s.recordFlow(ev.token!, ev.from!, ev.to!, ev.value!, ev.ts);
    expect(newWalletAccumulation(s, ev, now)).toBeNull();
  });

  it("returns null for an old wallet", () => {
    const s = new RollingState({ windowSec: 86400 });
    seedBaseline(s, "0xtok", 12, 0);
    s.recordFlow("0xtok", "0xsrc", "0xold", 100n, 0); // first-seen at t=0
    const ev: ChainEvent = { blockNumber: 9n, txHash: "0x9", logIndex: 0, kind: "transfer",
      token: "0xtok", from: "0xsrc", to: "0xold", value: 1000n, ts: 200000 };
    s.recordFlow(ev.token!, ev.from!, ev.to!, ev.value!, ev.ts);
    expect(newWalletAccumulation(s, ev, 200000)).toBeNull();
  });
});
