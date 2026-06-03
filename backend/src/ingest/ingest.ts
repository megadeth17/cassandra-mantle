import { createPublicClient, http, decodeEventLog, type Log } from "viem";
import type { ChainEvent } from "@shared/types";
import { TRANSFER_EVENT, SYNC_EVENT, TRANSFER_TOPIC, SYNC_TOPIC } from "./abis.js";
import { config } from "../config.js";

export const client = createPublicClient({ transport: http(config.rpc) });

export function decodeLog(log: Log, ts: number): ChainEvent | null {
  const topic0 = log.topics[0];
  try {
    if (topic0 === TRANSFER_TOPIC) {
      const d = decodeEventLog({ abi: [TRANSFER_EVENT], data: log.data, topics: log.topics });
      const args = d.args as { from: `0x${string}`; to: `0x${string}`; value: bigint };
      return {
        blockNumber: log.blockNumber!,
        txHash: log.transactionHash!,
        logIndex: log.logIndex!,
        kind: "transfer",
        token: log.address as `0x${string}`,
        from: args.from,
        to: args.to,
        value: args.value,
        ts,
      };
    }
    if (topic0 === SYNC_TOPIC) {
      const d = decodeEventLog({ abi: [SYNC_EVENT], data: log.data, topics: log.topics });
      const args = d.args as { reserve0: bigint; reserve1: bigint };
      return {
        blockNumber: log.blockNumber!,
        txHash: log.transactionHash!,
        logIndex: log.logIndex!,
        kind: "sync",
        pool: log.address as `0x${string}`,
        reserve0: args.reserve0,
        reserve1: args.reserve1,
        ts,
      };
    }
  } catch {
    return null;
  }
  return null;
}

/** Pull all logs in a block range and decode. Returns events sorted by (block, logIndex). */
export async function fetchEvents(fromBlock: bigint, toBlock: bigint): Promise<ChainEvent[]> {
  const logs = await client.getLogs({ fromBlock, toBlock });
  const block = await client.getBlock({ blockNumber: toBlock });
  const ts = Number(block.timestamp);
  const events = logs
    .map((l) => decodeLog(l, ts))
    .filter((e): e is ChainEvent => e !== null);
  events.sort((a, b) =>
    a.blockNumber === b.blockNumber
      ? a.logIndex - b.logIndex
      : Number(a.blockNumber - b.blockNumber)
  );
  return events;
}
