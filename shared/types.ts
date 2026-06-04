export type SignalType =
  | "whale_flow"
  | "new_wallet_accumulation"
  | "abnormal_liquidity"
  | "contract_interaction_spike";

export type Direction = "bullish" | "bearish" | "neutral";
export type SignalStatus = "pending" | "hit" | "miss";

export interface ChainEvent {
  blockNumber: bigint;
  txHash: `0x${string}`;
  logIndex: number;
  kind: "transfer" | "swap" | "sync" | "call";
  token?: `0x${string}`;
  from?: `0x${string}`;
  to?: `0x${string}`;
  value?: bigint;          // raw token units
  pool?: `0x${string}`;
  reserve0?: bigint;
  reserve1?: bigint;
  contract?: `0x${string}`;
  ts: number;              // unix seconds
}

export interface Signal {
  id: string;              // deterministic: `${type}:${subject}:${blockNumber}`
  type: SignalType;
  subject: `0x${string}`;  // token or wallet under watch
  direction: Direction;
  score: number;           // 0..100
  evidence: Record<string, unknown>; // the numbers/txs that triggered it
  blockNumber: bigint;
  ts: number;
  priceToken?: `0x${string}`; // address to price for resolution (token for flow signals, pool for liquidity); undefined => unresolvable
}
