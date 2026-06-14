# Cassandra — Turing Test Hackathon 2026 Submission

**Track:** AI Alpha & Data
**Network:** Mantle mainnet (chainId 5000)

## One-line
The unfakeable track-record layer for the on-chain agent economy: an autonomous alpha agent that writes every call to Mantle under its own ERC-8004 identity — before the outcome is known — so its hit-rate is provable, not self-reported.

## Why this matters now (the RWAi angle)
Mantle's thesis is the RWAi economy: real assets tokenized, AI agents trading them on-chain. Nansen's CEO calls that "potentially the most valuable company on Earth." But if agents are going to move real money, one question decides everything: *which agents can you actually trust?* Today that answer is a screenshot. Cassandra is the missing primitive — a neutral, read-only benchmark that gives every agent an **unfakeable, on-chain reputation**. It can't rug you and can't touch your funds; it only proves track records. ERC-8004 is the identity standard; Cassandra is the performance ledger that rides on it. The agent economy needs a credit score, and it has to live on-chain. That's this.

## The pitch
Crypto alpha runs on unverifiable claims. Anyone can claim a 90% hit-rate; nobody can prove one, because the misses get deleted. Cassandra watches Mantle in real time, detects anomalies and smart-money moves across four detectors, and commits every call to an immutable on-chain registry the instant it fires — before the market resolves it. Each call later auto-resolves to hit or miss, also on-chain. The result is a public, timestamped, tamper-proof track record: the calls are inscribed before they can be cherry-picked, so the record cannot be faked. Delivered via Telegram, proven on a live dashboard. The hit-rate it reports is whatever the chain says — that honesty *is* the product.

## How it maps to the hackathon's three signature features
1. **On-chain benchmarking of AI** — every signal + its hit/miss resolution is recorded on Mantle via `SignalRegistry`. The agent's performance is a permanent on-chain record.
2. **ERC-8004 agent identity** — Cassandra mints one soulbound identity NFT (`AgentIdentity`); all signals are gated on and attributed to that identity. The reputation is bound to the agent, non-transferable.
3. **Radical transparency** — a public read-only dashboard renders the full call ledger + rolling hit-rate, and a live SSE "thinking" feed streams the agent evaluating chain events in real time for the Human-vs-AI live-stream.

## The four detectors
1. **Whale Flow** — top-percentile net token inflow vs recent baseline.
2. **New-Wallet Accumulation** — wallets first-seen within 6h accumulating a token.
3. **Abnormal Liquidity** — pool-reserve moves beyond a z-score band (rug / large add/remove).
4. **Contract-Interaction Spike** — per-block interaction count jumping past a contract's baseline.

Every fired signal is scored 0–100, written on-chain with an evidence hash, delivered to Telegram with a Mantle explorer proof link, and auto-resolved after a per-detector window.

## Architecture
Mantle RPC → block-by-block ingestion → 4 pure-function detectors → on-chain `submit` (signed by the ERC-8004 identity) → Telegram delivery (gated on confirmed write) → resolver auto-closes to hit/miss → Next.js dashboard reads the registry. No transaction execution — observe-and-record only. No paid data APIs (Mantle RPC + pool reserves only), so it survives to judging with zero key-expiry risk.

## Tests
- Contracts: 13 passing (Hardhat) — identity single-mint + soulbound, registry submit/resolve ACL, once-only resolution, negative paths.
- Backend: 30 passing (Vitest) — every detector, rolling state/baseline/cooldown, log decode, evidence hash + enum encoding, outcome decision + unresolvable guard, flow dedup, pending persistence, telegram formatting.
- Frontend: clean `next build`.

## Deployed addresses (Mantle mainnet, chainId 5000)
- AgentIdentity: `0x3f6a671a81Fc7f24BF378aBCf8E31AD7bEd65250` — https://mantlescan.xyz/address/0x3f6a671a81Fc7f24BF378aBCf8E31AD7bEd65250
- SignalRegistry: `0x708dFb5fFea4B0149E6F1714F5A72D5291f0bB5b` — https://mantlescan.xyz/address/0x708dFb5fFea4B0149E6F1714F5A72D5291f0bB5b
- Agent identity token id: 1 (soulbound, owned by the agent operator address)
- Agent operator: `0xD64872bC1B77B6550e7aA0a51E35E61Ebca21f04`

## Links (fill before submission)
- Repo: https://github.com/megadeth17/cassandra-mantle
- Live dashboard: https://cassandra-mantle.vercel.app
- Telegram channel: `…`
- Demo video: `…`

## DoraHacks BUIDL checklist
- [x] Repo link — https://github.com/megadeth17/cassandra-mantle
- [ ] Deployed-on-Mantle proof (deploy tx hashes on Mantle Sepolia)
- [ ] Demo video (full flow: signal → on-chain submit → Telegram → dashboard → resolve → hit-rate update)
- [ ] Addresses filled above
