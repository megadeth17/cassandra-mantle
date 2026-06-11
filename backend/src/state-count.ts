import { readFileSync, writeFileSync, existsSync } from "fs";

const FILE = ".inscribed-count.json";

/**
 * Persisted count of signals inscribed in the current campaign. Survives
 * restarts so a hard inscription cap (config.maxInscriptions) can never be
 * bypassed by relaunching the agent — the gas spend is bounded for real,
 * not by discipline. Reset by deleting the file to start a fresh campaign.
 */
export function loadCount(file: string = FILE): number {
  if (!existsSync(file)) return 0;
  try {
    const n = JSON.parse(readFileSync(file, "utf8")).count;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function saveCount(count: number, file: string = FILE): void {
  writeFileSync(file, JSON.stringify({ count }));
}
