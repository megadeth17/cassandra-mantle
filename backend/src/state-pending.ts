import { readFileSync, writeFileSync, existsSync } from "fs";
import type { PendingCall } from "./resolver/resolver.js";

const FILE = ".pending.json";

function isValidPending(p: unknown): p is PendingCall {
  if (typeof p !== "object" || p === null) return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.type === "string" &&
    typeof o.direction === "string" &&
    typeof o.subject === "string" &&
    typeof o.submittedAt === "number" &&
    typeof o.priceAt === "number" &&
    (o.priceToken === undefined || typeof o.priceToken === "string")
  );
}

/**
 * Loads in-flight pending calls persisted across restarts. Without this the
 * agent forgets every unresolved call on restart (the resolver only tracks
 * calls it published in the current process), so they could never resolve.
 * Corrupt/missing file -> empty list (the agent starts clean, never crashes).
 */
export function loadPending(file: string = FILE): PendingCall[] {
  if (!existsSync(file)) return [];
  try {
    const raw = JSON.parse(readFileSync(file, "utf8"));
    if (!Array.isArray(raw)) return [];
    return raw.filter(isValidPending);
  } catch {
    return [];
  }
}

/** Persists the pending list. Called after every push and every resolution. */
export function savePending(pending: PendingCall[], file: string = FILE): void {
  writeFileSync(file, JSON.stringify(pending));
}
