---
created: 2026-06-03
tags: [project, free-dev, hackathon, mantle, ai-agent, design-spec]
status: hackathon
type: design-spec
hackathon: The Turing Test Hackathon 2026 (Mantle)
track: AI Alpha & Data
deadline: 2026-06-15
demo_day: 2026-07-02
---

# Cassandra — Design Spec

> The seer who foresaw the truth but was never believed. On-chain proof breaks
> the curse: every call she makes is written to Mantle, timestamped and signed,
> so her hit-rate is verifiable instead of claimed.

## 1. Summary

Cassandra is an autonomous on-chain alpha agent for the Mantle network. It
watches Mantle activity in real time, detects anomalies and smart-money moves
across four detectors, and writes every signal it produces to an immutable
on-chain registry under its own ERC-8004 agent identity. Each call later
auto-resolves to hit or miss, producing a public, unfakeable track record.

Signals are delivered to users via a Telegram bot. A Next.js dashboard reads
the on-chain registry and renders the live track record and rolling hit-rate.

**The wedge:** crypto Twitter is full of unverifiable alpha callers. Cassandra's
every call is on-chain before the outcome is known, so the record cannot be
edited, cherry-picked, or faked. This maps directly onto the hackathon's three
signature features — on-chain AI benchmarking, ERC-8004 agent identity, and
radical transparency for the live-streamed Human vs AI phase.

## 2. Hackathon fit

| Hackathon feature | How Cassandra satisfies it |
|---|---|
| On-chain benchmarking of AI | Every signal + its resolution is recorded on Mantle |
| ERC-8004 agent identity | Cassandra mints one identity NFT; all calls signed by it |
| Radical transparency | Public dashboard + live "thinking" feed during stream |
| Track: AI Alpha & Data | Smart-money tracking + anomaly detection, Telegram delivery |
| Best UI/UX ($3K) | Polished dashboard, read-only verifiable record |
| Grand Champion / Mantle fit | Native Mantle data, self-contained, deployable |

## 3. Architecture

```
                    Mantle public RPC
                  (blocks, logs, txs)
                          │
                          ▼
              ┌───────────────────────┐
              │   Ingestion service    │  poll new blocks, decode logs,
              │   (Node.js + viem)     │  maintain rolling wallet/token state
              └───────────┬───────────┘
                          ▼
              ┌───────────────────────┐
              │   Detector engine      │  4 detectors score events 0–100
              │   - whale flow         │  emit Signal when score ≥ threshold
              │   - new-wallet accum    │
              │   - abnormal liquidity │
              │   - contract-interaction spike
              └───────────┬───────────┘
                          ▼
                    Signal object
        {id, type, subject, score, evidence, direction, ts}
                          │
        ┌─────────────────┼──────────────────────┐
        ▼                 ▼                       ▼
  SignalRegistry.sol  Telegram bot          Next.js dashboard
  (Mantle)            (delivery + links)    (reads registry on-chain)
  writes signal,                            live track record,
  signed by ERC-8004                        rolling hit-rate,
  identity                                  "thinking" feed (SSE)
        │
        ▼
  Resolver service  ── after N hours, pull price/flow outcome,
  (cron-style loop)    call registry.resolve(id, hit|miss)
```

### 3.1 Components

Each component is independently testable with a defined interface.

**Ingestion service** (`backend/src/ingest/`)
- Polls Mantle RPC for new blocks; decodes ERC-20 Transfer / DEX swap / LP
  events via viem.
- Maintains short-window in-memory state: per-token net flow, per-wallet first-seen,
  per-pool reserves.
- Input: RPC endpoint. Output: stream of decoded `ChainEvent` objects.
- No detection logic here — pure decode + state.

**Detector engine** (`backend/src/detectors/`)
- Four pure-function detectors, each `(state, event) → Signal | null`:
  1. `whaleFlow` — single-tx or short-window net flow above a token-relative
     threshold (percentile of recent flows, not a fixed USD number).
  2. `newWalletAccumulation` — wallet first-seen < T ago accumulating a token
     across multiple txs; clustered new wallets buying same token = higher score.
  3. `abnormalLiquidity` — pool reserve change beyond rolling stddev band
     (rug / large add / large remove).
  4. `contractInteractionSpike` — interaction count for a contract jumps beyond
     its rolling baseline (early-attention signal).
- Scoring pattern reused from YieldPulse `risk-scorer.js` (weighted-factor, 0–100).
- Output: `Signal` with `evidence` (the txs/numbers that triggered it) and a
  `direction` (bullish/bearish/neutral) for later resolution.

**SignalRegistry.sol** (`contracts/`)
- Stores: `signalId`, `signalType`, `subject` (token/wallet), `directionHash`,
  `evidenceHash` (IPFS or keccak of evidence JSON), `timestamp`, `status`
  (pending/hit/miss), `agentId` (ERC-8004 token id).
- `submit(signal)` — only callable by the authorized agent identity.
- `resolve(signalId, outcome)` — only callable by resolver, only once, only on
  pending signals.
- Emits events for the dashboard to index.
- Derived from SentinelRWA `AgentLogger.sol` (hash-on-chain + ACL pattern).

**ERC-8004 identity** (`contracts/`)
- Mint one identity NFT for Cassandra per the ERC-8004 standard.
- Registry checks `msg.sender` owns / is delegated by the Cassandra identity
  before accepting `submit`.
- This is the on-chain reputation anchor: track record accrues to the identity.

**Resolver service** (`backend/src/resolver/`)
- Loop: for each pending signal older than its resolution window (per signal
  type, e.g. whaleFlow = 6h price move), fetch outcome from RPC/price source,
  decide hit/miss by direction vs realized move, call `registry.resolve`.
- Idempotent; safe to re-run; persists last-processed cursor.

**Telegram bot** (`backend/src/telegram/`)
- On new signal: format message (type, subject, score, one-line evidence) +
  Mantle explorer link to the on-chain `submit` tx + link to the dashboard.
- Commands: `/record` (current hit-rate), `/last` (recent calls), `/watch <token>`.

**Dashboard** (`frontend/`)
- Next.js 14 + wagmi v2 + viem v2.
- **Reuse the data plumbing only** (invisible layer): contract-read hooks,
  `useSSE.ts` real-time hook, and the API-fallback/mock pattern from SentinelRWA
  / YieldPulse. No reason to rebuild wiring.
- **Build a fresh visual layer** (see §3.3). The SentinelRWA skin is NOT reused —
  Cassandra gets its own design system. A recycled dashboard reads derivative and
  cannot win Best UI/UX; Cassandra is its own brand.
- Reads `SignalRegistry` events on Mantle → renders the call ledger with status,
  rolling hit-rate by detector, and per-signal evidence.
- Live "thinking" feed via SSE: detector engine evaluating events in real time
  during the live-stream — the standout demo feature.
- Read-only, no wallet connect required to view (lower friction for judges).

### 3.3 Design direction — Oracle terminal / dark luxury

Cassandra is a seer; the UI should feel like reading an oracle's verified ledger.

- **Base:** deep dark surface (not pure black), layered panels with subtle depth.
- **Accent:** single oracular accent — oracle-green or muted gold — used
  semantically (hit / pending / miss states), never decoratively.
- **Type:** editorial headline face paired with a monospace data face; large
  hit-rate hero number as the focal point of the proof story.
- **Motion:** signals enter the live ledger like prophecies being inscribed;
  compositor-friendly only (transform/opacity), respects reduced-motion.
- **Anti-template:** follows the web design-quality rules — intentional hierarchy,
  rhythm, depth, designed hover/focus states. No default card grid.
- Built with the `frontend-design` skill in the implementation phase. Goal: a
  screenshot strong enough to drive the X / Community Voting angle.

### 3.2 Data flow (happy path)

1. Block arrives → ingestion decodes events → updates state.
2. Each event run through 4 detectors → one fires, emits `Signal`.
3. Backend writes evidence JSON, computes `evidenceHash`, calls
   `registry.submit(...)` signed by Cassandra's identity → tx on Mantle.
4. On tx confirmation: push to Telegram + emit SSE event to dashboard.
5. Resolver, hours later, resolves the call on-chain → dashboard hit-rate updates.

## 4. Error handling

- **RPC failure / lag:** exponential backoff; persist last-processed block cursor;
  on restart resume from cursor (no missed or double-counted blocks). Graceful
  degradation — if RPC down, bot announces "feed degraded" rather than going
  silent or emitting garbage.
- **Detector false-positive control:** per-type score thresholds + cooldown per
  subject (no spamming the same wallet/token). Thresholds tunable via config.
- **On-chain submit failure:** retry with bumped gas; if still failing, queue
  signal locally and surface a degraded-state warning. Never deliver a Telegram
  signal whose on-chain write failed — the on-chain record is the product, so
  delivery is gated on a confirmed `submit` tx.
- **Resolver:** idempotent, only resolves pending, never re-resolves — prevents
  record tampering even by a buggy resolver.

## 5. Testing

- **Unit:** each detector is a pure function — test against fixture `ChainEvent`
  sets (known whale move, known new-wallet cluster, known rug). 80%+ on detectors.
- **Contract:** Hardhat tests for `submit` ACL (only identity), `resolve`
  once-only + pending-only, event emission. (Reuse SentinelRWA test patterns.)
- **Integration:** ingestion against a Mantle testnet fork / recorded blocks →
  assert expected signals fire.
- **E2E demo path:** scripted block replay → signal → on-chain submit → TG +
  dashboard render → resolve → hit-rate update. This is also the live-stream rehearsal.

## 6. Reused assets (free-developments brain)

| Asset | Source project | Cassandra use |
|---|---|---|
| `AgentLogger.sol` (hash + ACL) | SentinelRWA | → `SignalRegistry.sol` |
| Blockchain service (viem/ethers wrapper) | SentinelRWA | submit/resolve calls |
| wagmi/viem contract-read hooks (plumbing) | SentinelRWA | dashboard data layer only |
| WebSocket / streaming backend | SentinelRWA | "thinking" feed transport |
| `risk-scorer.js` weighted scoring | YieldPulse | detector scoring pattern |
| `useSSE.ts` real-time hook | YieldPulse | dashboard live feed wiring |
| API fallback + mock pattern | SentinelRWA | standalone demo without live RPC |

**Not reused:** SentinelRWA's visual design / skin. Cassandra ships a fresh
design system (§3.3) — only the invisible data plumbing carries over.

## 7. Out of scope (YAGNI)

- No transaction execution / trading — Cassandra observes and records only.
- No multi-chain — Mantle only.
- No content-skill-graph build dependency. Optional, manual X distribution of
  verified calls for the Community Voting prize is a separate post-build activity,
  not part of this spec.
- No user accounts / auth on the dashboard (read-only public).
- No paid data APIs (Arkham/Nansen) — avoids key-expiry risk through July judging.

## 8. Tech stack

Solidity 0.8.24, Hardhat, OpenZeppelin v5, ERC-8004 reference impl;
Node.js 18+, TypeScript, viem v2, Telegraf (Telegram); Next.js 14, wagmi v2,
viem v2, Tailwind, Recharts; Mantle public RPC + Mantle testnet for deploy.

## 9. Open risks

- **ERC-8004 reference availability** — confirm a usable reference implementation
  exists for the standard before relying on it; fall back to a minimal identity
  NFT + registry-ACL if the spec is still draft-only.
- **12-day full scope, solo** — four detectors + auto-resolution + polished UI is
  aggressive. Mitigation: detectors are independent and ship incrementally;
  resolution and polish are the last-cut items if time runs short.
- **Mantle RPC rate limits** — verify public RPC throughput; add a fallback
  endpoint list.
