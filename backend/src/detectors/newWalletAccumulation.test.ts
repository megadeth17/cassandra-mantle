import { describe, it, expect } from "vitest";
import { RollingState } from "../engine/state.js";
import { newWalletAccumulation } from "./newWalletAccumulation.js";
import type { ChainEvent } from "@shared/types";

describe("newWalletAccumulation", () => {
  it("fires when a wallet first-seen recently keeps accumulating", () => {
    const s = new RollingState({ windowSec: 86400 });
    const now = 100000;
    for (let i = 0; i < 4; i++) s.recordFlow("0xtok", "0xsrc", "0xnew", 100n, now + i);
    const ev: ChainEvent = { blockNumber: 9n, txHash: "0x9", logIndex: 0, kind: "transfer",
      token: "0xtok", from: "0xsrc", to: "0xnew", value: 100n, ts: now + 4 };
    s.recordFlow(ev.token!, ev.from!, ev.to!, ev.value!, ev.ts);
    const sig = newWalletAccumulation(s, ev, now + 4);
    expect(sig).not.toBeNull();
    expect(sig!.type).to.equal("new_wallet_accumulation");
    expect(sig!.direction).to.equal("bullish");
  });

  it("returns null for an old wallet", () => {
    const s = new RollingState({ windowSec: 86400 });
    s.recordFlow("0xtok", "0xsrc", "0xold", 100n, 0); // first-seen at t=0
    const ev: ChainEvent = { blockNumber: 9n, txHash: "0x9", logIndex: 0, kind: "transfer",
      token: "0xtok", from: "0xsrc", to: "0xold", value: 100n, ts: 200000 };
    s.recordFlow(ev.token!, ev.from!, ev.to!, ev.value!, ev.ts);
    expect(newWalletAccumulation(s, ev, 200000)).toBeNull();
  });
});
