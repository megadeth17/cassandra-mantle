<div align="center">

# Cassandra

### The seer whose calls are provable.

**An autonomous on-chain alpha agent on Mantle that inscribes every signal to an immutable registry — under its own ERC-8004 soulbound identity — _before the outcome is known_. The hit-rate is computed from chain state. It cannot be faked.**

[Live registry](https://mantlescan.xyz/address/0x708dFb5fFea4B0149E6F1714F5A72D5291f0bB5b) · [Agent identity](https://mantlescan.xyz/address/0x3f6a671a81Fc7f24BF378aBCf8E31AD7bEd65250) · Turing Test Hackathon 2026 · Track: AI Alpha & Data

</div>

---

## The problem

Crypto alpha runs on unverifiable claims. Anyone can screenshot a 90% hit-rate; nobody can prove one, because the misses get quietly deleted. The track record lives on a platform that lets you erase it — so it isn't a record at all.

## What Cassandra does

Cassandra watches Mantle in real time and runs four anomaly / smart-money detectors. The instant one fires, the signal is **signed under the agent's ERC-8004 identity and written on-chain — before the market resolves it.** A resolver later closes each call to **hit** or **miss** against price. The result is a public, timestamped, tamper-proof track record: the calls are on-chain before they can be cherry-picked, so the record cannot be faked.

No transaction execution — observe-and-record only. No paid data APIs (Mantle RPC + pool reserves only).

## Why now — the trust layer for the RWAi economy

Mantle's thesis is the **RWAi economy**: real-world assets tokenized, AI agents trading them on-chain. If agents are going to move real money, one question decides everything — *which agents can you actually trust?* Today the answer is a screenshot. Cassandra is the missing primitive: a neutral, **read-only reputation layer** that gives any agent an unfakeable, on-chain track record. It can't rug you and can't touch your funds — it only proves performance. ERC-8004 is the agent-identity standard; Cassandra is the performance ledger that rides on it. The agent economy needs a credit score, and it has to live on-chain.

## How it maps to the hackathon's three signature features

| Feature | How |
|---|---|
| **On-chain AI benchmarking** | Every signal **and** its hit/miss resolution is a transaction in `SignalRegistry`. The agent's performance is a permanent, recomputable-by-anyone on-chain record. |
| **ERC-8004 agent identity** | One soulbound identity NFT (`AgentIdentity`); all signals are gated on and attributed to it. Reputation is bound to the agent and non-transferable. |
| **Radical transparency** | A public read-only dashboard renders the full call ledger + rolling hit-rate, plus a live SSE feed of the agent evaluating chain events in real time. |

## The four detectors

1. **Whale Flow** — top-percentile net token inflow vs a recent baseline.
2. **New-Wallet Accumulation** — a freshly-seen wallet receiving a *top-percentile* inflow (deliberate accumulation, not dust).
3. **Abnormal Liquidity** — pool-reserve moves beyond a z-score band.
4. **Contract-Interaction Spike** — per-block interaction count jumping past a contract's baseline.

Every fired signal is scored 0–100, gated on resolvability (only priceable subjects are inscribed, so every call can later be closed), written on-chain with an evidence hash, delivered to Telegram with a Mantlescan proof link, and auto-resolved after a per-detector window.

## Architecture

```
Mantle RPC → block-by-block ingestion → 4 pure-function detectors
   → resolvability + conviction gate → on-chain submit (signed by ERC-8004 identity)
   → Telegram delivery (gated on confirmed write) → resolver auto-closes hit/miss
   → Next.js dashboard reads the registry directly
```

Durability: the block cursor and in-flight pending calls are both persisted to disk, so resolutions survive restarts. Signals are written on-chain **first**; everything downstream is gated on the confirmed write.

## Deployed on Mantle mainnet (chainId 5000)

| Contract | Address |
|---|---|
| `SignalRegistry` | [`0x708dFb5fFea4B0149E6F1714F5A72D5291f0bB5b`](https://mantlescan.xyz/address/0x708dFb5fFea4B0149E6F1714F5A72D5291f0bB5b) |
| `AgentIdentity` (ERC-8004, soulbound) | [`0x3f6a671a81Fc7f24BF378aBCf8E31AD7bEd65250`](https://mantlescan.xyz/address/0x3f6a671a81Fc7f24BF378aBCf8E31AD7bEd65250) |
| Agent operator | [`0xD64872bC1B77B6550e7aA0a51E35E61Ebca21f04`](https://mantlescan.xyz/address/0xD64872bC1B77B6550e7aA0a51E35E61Ebca21f04) |

**Verify it yourself:** open the registry on Mantlescan and read the `SignalSubmitted` / `SignalResolved` events. The dashboard's hit-rate is nothing more than those events, recomputed.

## Repo layout

```
contracts/   Hardhat · Solidity 0.8.24 · OZ 5.0.2 — AgentIdentity (soulbound ERC721), SignalRegistry (submit/resolve ACL)
backend/     TypeScript — detectors, rolling engine, ingest, on-chain publisher, resolver, Telegram, SSE
frontend/    Next.js 14 · wagmi/viem · Tailwind — reads the registry on-chain, renders the provable ledger
shared/      Shared signal types
```

## Run it

```bash
# Contracts
cd contracts && npm i && npx hardhat test

# Backend agent (needs backend/.env: MANTLE_RPC, AGENT_PK, SIGNAL_REGISTRY, TELEGRAM_*)
cd backend && npm i && npm test && npm start

# Frontend dashboard (needs frontend/.env.local: NEXT_PUBLIC_MANTLE_RPC, NEXT_PUBLIC_SIGNAL_REGISTRY, NEXT_PUBLIC_REGISTRY_FROM_BLOCK)
cd frontend && npm i && npm run dev
```

Secrets live only in gitignored `.env` files — see `backend/.env.example`. The agent key spends real mainnet MNT; never commit it.

## Tests

- Contracts: 13 (Hardhat) — identity single-mint + soulbound, registry submit/resolve ACL, once-only resolution.
- Backend: 30 (Vitest) — every detector, rolling state/baseline/cooldown, log decode, evidence hash, outcome decision + unresolvable guard, pending persistence, Telegram formatting.
- Frontend: clean `next build`.

---

<div align="center">
<em>Don't trust the seer. Verify the ledger.</em>
</div>
