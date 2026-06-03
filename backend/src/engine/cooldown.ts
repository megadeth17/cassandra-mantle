export class Cooldown {
  private windowSec: number;
  private last = new Map<string, number>();
  constructor(windowSec: number) { this.windowSec = windowSec; }

  allow(type: string, subject: string, ts: number): boolean {
    const key = `${type}:${subject}`;
    const prev = this.last.get(key);
    if (prev !== undefined && ts - prev < this.windowSec) return false;
    this.last.set(key, ts);
    return true;
  }
}
