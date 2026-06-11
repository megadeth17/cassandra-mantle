import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { SIGNAL_REGISTRY_ABI } from "../chain/registryAbi.js";
import { client } from "../ingest/ingest.js";
import { config } from "../config.js";
import { decideOutcome } from "./outcome.js";
import type { Direction } from "@shared/types";

// resolution windows per signal type (seconds)
export const RESOLUTION_WINDOW: Record<string, number> = {
  whale_flow: 6 * 3600,
  new_wallet_accumulation: 24 * 3600,
  abnormal_liquidity: 2 * 3600,
  contract_interaction_spike: 12 * 3600,
};

export interface PendingCall {
  id: string;
  type: string;
  direction: Direction;
  subject: `0x${string}`;
  submittedAt: number;
  priceAt: number;
  priceToken?: `0x${string}`;
}

const HIT = 1, MISS = 2;

export function makeResolver(getPrice: (subject: `0x${string}`) => Promise<number>) {
  if (!config.agentPk || !config.signalRegistry) {
    return {
      resolveDue: async (_pending: PendingCall[], _now: number) => [] as string[],
      configured: false as const,
    };
  }
  const account = privateKeyToAccount(config.agentPk);
  const wallet = createWalletClient({ account, transport: http(config.rpc) });
  const address = config.signalRegistry;

  return {
    configured: true as const,
    /** resolves all calls past their window; returns ids resolved */
    async resolveDue(pending: PendingCall[], now: number): Promise<string[]> {
      const done: string[] = [];
      for (const c of pending) {
        const window = config.resolveWindowSec > 0
          ? config.resolveWindowSec
          : (RESOLUTION_WINDOW[c.type] ?? 6 * 3600);
        if (now - c.submittedAt < window) continue;
        if (!c.priceToken) continue;                 // nothing priceable -> stays pending
        const priceAfter = await getPrice(c.priceToken);
        const outcome = decideOutcome(c.direction, c.priceAt, priceAfter, config.resolveThreshold);
        if (outcome === "unresolvable") continue; // leave pending, retry next pass
        const hash = await wallet.writeContract({
          address, abi: SIGNAL_REGISTRY_ABI, functionName: "resolve",
          args: [c.id, outcome === "hit" ? HIT : MISS], chain: null,
        });
        await client.waitForTransactionReceipt({ hash });
        done.push(c.id);
      }
      return done;
    },
  };
}
