import { createWalletClient, http, keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Signal, SignalType, Direction } from "@shared/types";
import { SIGNAL_REGISTRY_ABI } from "./registryAbi.js";
import { client } from "../ingest/ingest.js";
import { config } from "../config.js";

// Must match Solidity enum order in SignalRegistry.sol
// signalType is stored as raw uint8; no enum in contract — order matches shared SignalType convention
const TYPE_ORDER: SignalType[] = [
  "whale_flow",             // 0
  "new_wallet_accumulation",// 1
  "abnormal_liquidity",     // 2
  "contract_interaction_spike", // 3
];

// Must match Solidity: enum Direction { Bullish, Bearish, Neutral }
const DIR_ORDER: Direction[] = [
  "bullish",  // 0
  "bearish",  // 1
  "neutral",  // 2
];

export function signalTypeIndex(t: SignalType): number { return TYPE_ORDER.indexOf(t); }
export function directionIndex(d: Direction): number { return DIR_ORDER.indexOf(d); }

export function hashEvidence(evidence: Record<string, unknown>): `0x${string}` {
  const sorted = Object.keys(evidence).sort().reduce((acc, k) => {
    acc[k] = (evidence as Record<string, unknown>)[k];
    return acc;
  }, {} as Record<string, unknown>);
  return keccak256(toHex(JSON.stringify(sorted)));
}

export function makePublisher() {
  if (!config.agentPk || !config.signalRegistry) {
    return {
      submit: async (_s: Signal) => { throw new Error("publisher not configured"); },
      configured: false as const,
    };
  }
  const account = privateKeyToAccount(config.agentPk);
  const wallet = createWalletClient({ account, transport: http(config.rpc) });
  const address = config.signalRegistry;

  return {
    configured: true as const,
    /** writes the signal on-chain; returns tx hash on confirmation */
    async submit(s: Signal): Promise<`0x${string}`> {
      const hash = await wallet.writeContract({
        address, abi: SIGNAL_REGISTRY_ABI, functionName: "submit",
        args: [s.id, signalTypeIndex(s.type), s.subject, directionIndex(s.direction), s.score, hashEvidence(s.evidence)],
        chain: null,
      });
      await client.waitForTransactionReceipt({ hash });
      return hash;
    },
  };
}
