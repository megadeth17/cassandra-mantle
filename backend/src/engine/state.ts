interface FlowRec { token: string; from: string; to: string; value: bigint; ts: number; }

export class RollingState {
  private windowSec: number;
  private flows: FlowRec[] = [];
  private seen = new Map<string, number>(); // wallet -> first ts
  private seenEvents = new Set<string>();

  constructor(opts: { windowSec: number }) { this.windowSec = opts.windowSec; }

  recordFlow(token: string, from: string, to: string, value: bigint, ts: number, eventKey?: string) {
    if (eventKey) { if (this.seenEvents.has(eventKey)) return; this.seenEvents.add(eventKey); }
    if (!this.seen.has(to)) this.seen.set(to, ts);
    if (!this.seen.has(from)) this.seen.set(from, ts);
    this.flows.push({ token, from, to, value, ts });
    this.evict(ts);
  }

  private evict(now: number) {
    const cutoff = now - this.windowSec;
    while (this.flows.length && this.flows[0].ts < cutoff) this.flows.shift();
  }

  netInflow(token: string, wallet: string): bigint {
    let net = 0n;
    for (const f of this.flows) {
      if (f.token !== token) continue;
      if (f.to === wallet) net += f.value;
      if (f.from === wallet) net -= f.value;
    }
    return net;
  }

  firstSeen(wallet: string): number | undefined { return this.seen.get(wallet); }

  recentFlows(token: string): bigint[] {
    return this.flows.filter((f) => f.token === token).map((f) => f.value);
  }
}
