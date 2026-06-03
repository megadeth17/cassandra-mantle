import type { Signal } from "@shared/types";

const ARROW: Record<string, string> = { bullish: "🟢▲", bearish: "🔴▼", neutral: "⚪◆" };

export function formatSignal(s: Signal, txHash: string, explorer: string, dashboard: string): string {
  const title = s.type.replace(/_/g, " ").toUpperCase();
  return [
    `${ARROW[s.direction]} *${title}*  (score ${s.score})`,
    `subject: \`${s.subject}\``,
    `direction: ${s.direction}`,
    `proof: ${explorer}/tx/${txHash}`,
    `record: ${dashboard}`,
  ].join("\n");
}
