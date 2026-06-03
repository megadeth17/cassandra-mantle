import { readFileSync, writeFileSync, existsSync } from "fs";
const FILE = ".cursor.json";

export function loadCursor(fallback: bigint): bigint {
  if (!existsSync(FILE)) return fallback;
  return BigInt(JSON.parse(readFileSync(FILE, "utf8")).block);
}
export function saveCursor(block: bigint) {
  writeFileSync(FILE, JSON.stringify({ block: block.toString() }));
}
