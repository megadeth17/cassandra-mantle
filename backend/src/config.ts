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
};
