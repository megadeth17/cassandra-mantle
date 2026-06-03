import { Telegraf } from "telegraf";
import type { Signal } from "@shared/types";
import { formatSignal } from "./format.js";
import { config } from "../config.js";

const EXPLORER = "https://sepolia.mantlescan.xyz";
const DASHBOARD = process.env.DASHBOARD_URL ?? "https://cassandra.app";

export function makeBot() {
  if (!config.telegramToken || !config.telegramChannel) {
    return { send: async (_s: Signal, _tx: string) => {}, start: () => {}, configured: false as const };
  }
  const bot = new Telegraf(config.telegramToken);
  bot.command("record", (ctx) => ctx.reply(`Track record: ${DASHBOARD}`));
  return {
    configured: true as const,
    start() { bot.launch(); },
    async send(s: Signal, txHash: string) {
      await bot.telegram.sendMessage(
        config.telegramChannel!,
        formatSignal(s, txHash, EXPLORER, DASHBOARD),
        { parse_mode: "Markdown" },
      );
    },
  };
}
