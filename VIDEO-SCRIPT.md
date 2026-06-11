# Cassandra — Demo Video Script (~3 min)

**Goal:** judges see the full provable loop working live, plus the honesty angle.
**Tools:** OBS or any screen recorder, 1080p+. English voiceover or captions
(judges are international). Record AFTER the fresh batch resolves.

---

## Shot list

### 1. Hook — the problem (0:00–0:25)
**Screen:** Crypto Twitter / influencer "alpha" thread → cut to a Mantle RWAi
headline (the Nansen quote).
**Say:** "Mantle is building the RWAi economy — real assets, AI agents trading
them on-chain. But if agents move real money, one question decides everything:
which agents can you actually trust? Today the answer is a screenshot. Anyone
can claim 90% when the misses get deleted. Cassandra fixes that — it removes the
human, and the delete button."

### 2. The thesis (0:20–0:45)
**Screen:** Dashboard hero ("The record can't be faked when it's inscribed").
Scroll slowly through problem section → how-it-works.
**Say:** "Cassandra is an autonomous agent on Mantle. Four detectors watch the
chain in real time. The instant one fires, the signal is signed under her
ERC-8004 soulbound identity and written on-chain — BEFORE the outcome is known.
A resolver later closes every call to hit or miss, also on-chain. The hit-rate
is recomputed from chain state by anyone. It cannot be faked."

### 3. Proof — the registry is real (0:45–1:30)
**Screen:** Dashboard ledger → click a call → Mantlescan event log. Show the
SignalSubmitted event: id, score, evidence hash, timestamp. Then show a
SignalResolved event for the same id.
**Say:** "Every row is a transaction. Here's a call inscribed at this block —
and here's its resolution, written later. Notice the order: commitment first,
outcome second. Don't trust the seer — verify the ledger."
**Also show:** AgentIdentity contract on Mantlescan — soulbound, single mint.
"One identity, non-transferable. The reputation can't be laundered."

### 4. Live loop (1:30–2:15) — THE MONEY SHOT
**Screen:** Split or sequence: terminal `pm2 logs` / SSE thinking feed on the
dashboard → a signal fires → Telegram message arrives (@ the channel) with the
Mantlescan proof link → dashboard ledger shows the new pending call.
**Say:** "This is live. A detector fires, the call goes on-chain, Telegram
delivers it with the proof link — all before the market resolves it. Minutes
later, the resolver closes it. The score keeps itself."
**If a live resolution lands on camera (1h windows): gold. Show the pending
chip flip to Hit/Miss.**

### 5. Radical honesty (2:15–2:45)
**Screen:** Dashboard stats — full record including the early 0%-batch misses.
**Say:** "Full transparency: Cassandra's first calibration batch resolved 0%
— flat pairs against a 5% bar, and the record shows it, permanently. That's the
point. A fake seer would show you 90%. An honest benchmark shows you everything.
This is on-chain benchmarking of AI: the wins AND the losses, unfakeable."

### 6. Close (2:45–3:00)
**Screen:** CTA band ("The calls are already written. Go check.") → repo +
contract addresses.
**Say:** "Cassandra — the unfakeable reputation layer for the on-chain agent
economy. The seer whose calls are provable. Built on Mantle, ERC-8004 identity,
fully open-source. The calls are already written. Go check."

---

## Pre-flight checklist (before hitting record)
- [ ] Fresh batch resolved (12 calls, mixed hits/misses on dashboard)
- [ ] Agent running (pm2 online) so the thinking feed is live
- [ ] Dashboard open on deployed URL (not localhost) if Vercel is up
- [ ] Telegram channel visible with recent signal messages
- [ ] Mantlescan tabs pre-loaded: registry events, identity contract
- [ ] Browser zoom ~110%, dark theme, no bookmarks bar / personal tabs
- [ ] DO NOT show: .env, private keys, wallet balances in MetaMask, VPS IP

## Upload
YouTube unlisted (judges can view without account) → paste link into
SUBMISSION.md + DoraHacks BUIDL form.
