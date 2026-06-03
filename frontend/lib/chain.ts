import { createPublicClient, http } from "viem";

export const RPC =
  process.env.NEXT_PUBLIC_MANTLE_RPC ?? "https://rpc.sepolia.mantle.xyz";
export const REGISTRY = process.env.NEXT_PUBLIC_SIGNAL_REGISTRY as `0x${string}`;
export const EXPLORER = "https://sepolia.mantlescan.xyz";

export const publicClient = createPublicClient({ transport: http(RPC) });

// Must match Solidity enum order exactly
export const TYPE_LABEL = [
  "Whale Flow",
  "New-Wallet Accumulation",
  "Abnormal Liquidity",
  "Interaction Spike",
];
export const DIR_LABEL = ["Bullish", "Bearish", "Neutral"];
export const STATUS_LABEL = ["Pending", "Hit", "Miss"];
