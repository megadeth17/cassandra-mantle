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
};
