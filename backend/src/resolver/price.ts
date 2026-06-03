import { client } from "../ingest/ingest.js";
import { parseAbiItem } from "viem";

const GET_RESERVES = parseAbiItem("function getReserves() view returns (uint112,uint112,uint32)");

/** Spot price proxy of a pool: reserve1/reserve0. Returns 0 if unreadable. */
export async function poolSpot(pool: `0x${string}`): Promise<number> {
  try {
    const [r0, r1] = (await client.readContract({
      address: pool, abi: [GET_RESERVES], functionName: "getReserves",
    })) as [bigint, bigint, number];
    if (r0 === 0n) return 0;
    return Number(r1) / Number(r0);
  } catch {
    return 0; // unreadable pool -> 0 -> decideOutcome returns "unresolvable" -> stays pending
  }
}

/** Map a signal subject (token/wallet/pool address) to the pool used to price it.
 *  Fill with known Mantle pools at deploy time. Empty by default => price 0 =>
 *  calls stay pending (no false resolutions) until pools are configured. */
export const SUBJECT_POOL: Record<string, `0x${string}`> = {
  // "0xsubjectaddrlowercased": "0xpooladdr",
};

/** Resolve a subject to a price via its mapped pool, else 0 (unresolvable). */
export async function priceForSubject(subject: `0x${string}`): Promise<number> {
  const pool = SUBJECT_POOL[subject.toLowerCase()];
  return pool ? poolSpot(pool) : 0;
}
