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

/** Verified Merchant Moe classic (getReserves) pairs on Mantle mainnet.
 *  Maps a TOKEN address (lowercased) -> the pool used to price it. */
export const SUBJECT_POOL: Record<string, `0x${string}`> = {
  "0x4515a45337f461a11ff0fe8abf3c606ae5dc00c9": "0x763868612858358f62b05691db82ad35a9b3e110", // MOE  -> MOE/WMNT
  "0x78c1b0c915c4faa5fffa6cabf0219da63d7f4cb8": "0x763868612858358f62b05691db82ad35a9b3e110", // WMNT -> MOE/WMNT
  "0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9": "0x8e3a13418743ab1a98434551937ea687e451b589", // USDC -> USDC/USDT
  "0x201eba5cc46d216ce6dc03f6a759e8e766e956ae": "0x8e3a13418743ab1a98434551937ea687e451b589", // USDT -> USDC/USDT
};

/** Resolve an address to a price. If it's a known token, price via its mapped
 *  pool; otherwise treat the address itself as a pool (abnormal_liquidity case)
 *  and read its reserves directly. Returns 0 (=> unresolvable) if unreadable. */
export async function priceForSubject(addr: `0x${string}`): Promise<number> {
  const pool = SUBJECT_POOL[addr.toLowerCase()] ?? addr;
  return poolSpot(pool);
}
