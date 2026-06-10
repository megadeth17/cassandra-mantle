# Deploy the Cassandra agent on a VPS

The agent must run continuously through the resolution windows (whale 6h,
new-wallet 24h) for the hit-rate to populate. A VPS is the right home — it
survives reboots and doesn't sleep like a laptop.

Target tested: Hetzner CAX11 (ARM64, 4 GB) — pure Node/TS, no native deps, runs fine on ARM.

## 1. SSH in
```bash
ssh root@<your-vps-ip>
```

## 2. Prerequisites (skip what's already there)
```bash
node -v            # need >= 18; if missing:
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs
npm i -g pm2       # process manager (auto-restarts on crash)
```

## 3. Clone the (public) repo
```bash
cd ~ && git clone https://github.com/megadeth17/cassandra-mantle.git
cd cassandra-mantle/backend && npm install
```

## 4. Configure secrets — set these DIRECTLY on the server, never commit
```bash
cp .env.example .env
nano .env
```
Fill in:
- `AGENT_PK` — the real mainnet agent key (the one in your local backend/.env)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHANNEL_ID`
- `MANTLE_RPC`, `SIGNAL_REGISTRY` are pre-filled
- If port 8787 is taken by another agent on this box, set `SSE_PORT=8788`

> The agent key spends real MNT. Treat `.env` as a secret: `chmod 600 .env`.
> It is gitignored — `git status` must never show it.

## 5. Sanity check, then run
```bash
npm test                                   # 30 tests should pass
pm2 start npm --name cassandra-agent -- start
pm2 logs cassandra-agent                   # watch it boot + ingest
```

## 6. Monitor
```bash
pm2 status                                 # process health
cat .pending.json | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>console.log(JSON.parse(d).length,"pending"))'
# Balance: check operator 0xD64872bC1B77B6550e7aA0a51E35E61Ebca21f04 on mantlescan.xyz
```
As resolution windows close, `.pending.json` shrinks and the dashboard hit-rate
fills in. Stop any time with `pm2 stop cassandra-agent`.

## Notes
- **Budget:** ~0.75 MNT left. At floor 75 + the fixed new-wallet detector, new
  inscriptions are rare; most spend is resolutions (~0.012 MNT each). Watch the
  balance; stop if it nears ~0.1 MNT.
- **Reboot survival (optional, your call):** `pm2 save && pm2 startup` wires it
  to systemd so it relaunches on boot. Only do this if you want it permanent.
- **State is durable:** `.cursor.json` and `.pending.json` persist, so a
  restart resumes without losing pending calls.
