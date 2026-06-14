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

### 4. The delivery loop (1:30–2:15) — THE MONEY SHOT
**Screen:** Telegram channel "cassandra" → scroll the real signal messages, each
with score + a Mantlescan proof link. Tap one link → it opens the
`SignalSubmitted` event on Mantlescan. Then scroll that same call's
`SignalResolved` event (later block). Cut back to the dashboard ledger row for
the same call showing its final Hit/Miss chip.
**Say:** "Every call is delivered to Telegram the instant it fires — with the
proof link baked in. Follow the link: here's the call inscribed on-chain. Here's
its resolution, written later, at a higher block. Commitment first, outcome
second — you're watching the order yourself. The score keeps itself."
**Note:** the agent fires autonomously and slowly; do NOT wait for a live fire
on camera. The on-chain timestamps already prove the loop — that's the point.

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

## Tabs to pre-open (exact URLs)
1. **Dashboard** — https://cassandra-mantle.vercel.app  (wait ~10s for the on-chain
   data to load: 176 inscribed · 71 resolved · 0% · integrity caption)
2. **Registry on Mantlescan** — https://mantlescan.xyz/address/0x708dFb5fFea4B0149E6F1714F5A72D5291f0bB5b#events
3. **Identity (ERC-8004) on Mantlescan** — https://mantlescan.xyz/address/0x3f6a671a81Fc7f24BF378aBCf8E31AD7bEd65250
4. **Telegram channel** "cassandra" (your own view) — scroll to the real signal messages

## Pre-flight checklist (before hitting record)
- [ ] Dashboard loaded with real data (176 / 71 / 0% + "unfakeable, win or lose")
- [ ] Telegram channel shows the recent signal messages with proof links
- [ ] Mantlescan tabs pre-loaded (events tab on the registry)
- [ ] Browser zoom ~110%, dark theme, no bookmarks bar / personal tabs
- [ ] **DO NOT show on camera:** `.env`, the AGENT_PK, MetaMask balances, the VPS IP, the terminal with the ssh command

## Lead with honesty — the 0% is the feature
This is the whole pitch. A 0% hit-rate, shown willingly and provably, is *stronger*
evidence of an unfakeable benchmark than any 90% claim. Do not hide it or apologize
for it. Frame: "the agent's calls didn't clear the bar on these low-vol pairs — and
you can verify that, permanently, on-chain. That honesty is impossible to fake."

## Upload
YouTube **unlisted** (judges view without an account) → paste the link into
SUBMISSION.md + the DoraHacks BUIDL form.
