import { readFileSync, writeFileSync, existsSync } from "fs";
const FILE = ".cursor.json";

export function loadCursor(fallback: bigint): bigint {
  if (!existsSync(FILE)) return fallback;
  try {
    const v = JSON.parse(readFileSync(FILE, "utf8")).block;
    const b = BigInt(v);
    return b >= 0n ? b : fallback;
  } catch {
    return fallback; // corrupt cursor -> start from fallback
  }
}
export function saveCursor(block: bigint) {
  writeFileSync(FILE, JSON.stringify({ block: block.toString() }));
}
