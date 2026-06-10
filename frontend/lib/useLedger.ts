"use client";
import { useEffect, useMemo, useState } from "react";
import type { Call } from "./useSignals";
import { TYPE_LABEL, DIR_LABEL, EXPLORER, publicClient } from "./chain";

export type LedgerStatus = "hit" | "miss" | "pending";

export interface LedgerRow {
  id: string;
  detLabel: string;
  detColor: string;
  signal: string;
  subj: string;
  subjFull: string;
  score: string;
  outcome: { text: string; cls: "up" | "down" | "flat" };
  status: LedgerStatus;
  href: string;
  isNew?: boolean;
}

/** Detector accent colors, indexed to match the Solidity enum / TYPE_LABEL order. */
const DET_COLOR = ["#C9A227", "#7FA8C9", "#C97FA8", "#9DC97F"];
const STATUS_MAP: Record<number, LedgerStatus> = { 0: "pending", 1: "hit", 2: "miss" };

function shortAddr(a: string): string {
  if (!a || a.length < 12) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** Map a real on-chain Call into a ledger row. */
function rowFromCall(c: Call): LedgerRow {
  const status = STATUS_MAP[c.status] ?? "pending";
  const outcome =
    status === "hit"
      ? { text: "Confirmed", cls: "up" as const }
      : status === "miss"
        ? { text: "Invalidated", cls: "down" as const }
        : { text: "—", cls: "flat" as const };
  return {
    id: c.id,
    detLabel: TYPE_LABEL[c.type] ?? `Detector ${c.type}`,
    detColor: DET_COLOR[c.type] ?? "#C9A227",
    signal: `${DIR_LABEL[c.direction] ?? "Neutral"} signal`,
    subj: shortAddr(c.subject),
    subjFull: "Mantle mainnet",
    score: `${c.score}/100`,
    outcome,
    status,
    href: `${EXPLORER}/address/${c.subject}`,
  };
}

interface UseLedgerResult {
  rows: LedgerRow[];
  /** True when the registry has no live calls yet (honest empty state). */
  isEmpty: boolean;
  filter: "all" | LedgerStatus;
  setFilter: (f: "all" | LedgerStatus) => void;
  blockNo: number;
  hits: number;
  resolved: number;
  total: number;
}

/**
 * Builds the live ledger from REAL on-chain registry calls only. There is no
 * seeded/simulated data: the project's premise is a provable, unfakeable
 * record, so an empty registry is shown honestly rather than padded with
 * fabricated rows. The block number is read from Mantle, never synthesized.
 */
export function useLedger(calls: Call[], loading: boolean): UseLedgerResult {
  const rowsAll = useMemo(() => calls.map(rowFromCall), [calls]);
  const hasReal = rowsAll.length > 0;
  const isEmpty = !loading && !hasReal;

  const [filter, setFilter] = useState<"all" | LedgerStatus>("all");
  const [blockNo, setBlockNo] = useState(0);

  // Read the real Mantle head block; refresh periodically. No random walk.
  useEffect(() => {
    let active = true;
    const read = () =>
      publicClient
        .getBlockNumber()
        .then((b) => { if (active) setBlockNo(Number(b)); })
        .catch(() => {});
    read();
    const id = setInterval(read, 6000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const rows = filter === "all" ? rowsAll : rowsAll.filter((r) => r.status === filter);
  const hits = rowsAll.filter((r) => r.status === "hit").length;
  const resolved = rowsAll.filter((r) => r.status !== "pending").length;

  return { rows, isEmpty, filter, setFilter, blockNo, hits, resolved, total: rowsAll.length };
}
