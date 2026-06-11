import "dotenv/config";

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const config = {
  rpc: req("MANTLE_RPC"),
  agentPk: process.env.AGENT_PK as `0x${string}` | undefined,
  signalRegistry: process.env.SIGNAL_REGISTRY as `0x${string}` | undefined,
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChannel: process.env.TELEGRAM_CHANNEL_ID,
  startBlock: process.env.START_BLOCK ?? "latest",
  // Only inscribe signals scoring at/above this floor. Conserves gas and keeps
  // the on-chain record to high-conviction calls. 0 = publish everything.
  minPublishScore: Number(process.env.MIN_PUBLISH_SCORE ?? "0"),
  // Port for the SSE "thinking" feed. Override on a shared box to avoid clashes.
  ssePort: Number(process.env.SSE_PORT ?? "8787"),
  // Resolve-only mode: run the resolver to CLOSE outstanding pending calls but
  // inscribe NOTHING new. Spends gas only on resolutions — used to populate the
  // hit-rate from existing pending without risking another inscription burn.
  resolveOnly: process.env.RESOLVE_ONLY === "1" || process.env.RESOLVE_ONLY === "true",
  // HARD inscription cap for a bounded campaign. 0 = unlimited. When >0 the
  // agent stops inscribing after this many on-chain writes (persisted across
  // restarts) — the gas spend is provably bounded, not discipline-dependent.
  maxInscriptions: Number(process.env.MAX_INSCRIPTIONS ?? "0"),
  // Price-move fraction a call must clear to count as a hit (0.05 = 5%).
  // Lower for short windows / low-vol pairs so resolutions are meaningful.
  resolveThreshold: Number(process.env.RESOLVE_THRESHOLD ?? "0.05"),
  // Optional override (seconds) for every detector's resolution window. 0 =
  // use the per-detector defaults. Short windows let a fresh batch resolve fast.
  resolveWindowSec: Number(process.env.RESOLVE_WINDOW_SEC ?? "0"),
};
