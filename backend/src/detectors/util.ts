export function percentile(values: bigint[], target: bigint): number {
  if (values.length === 0) return 1;
  let below = 0;
  for (const v of values) if (v <= target) below++;
  return below / values.length; // 0..1
}

export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function signalId(type: string, subject: string, block: bigint): string {
  return `${type}:${subject}:${block.toString()}`;
}
