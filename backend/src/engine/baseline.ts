export class RollingBaseline {
  private size: number;
  private data = new Map<string, number[]>();
  constructor(size: number) { this.size = size; }

  push(key: string, value: number) {
    const arr = this.data.get(key) ?? [];
    arr.push(value);
    while (arr.length > this.size) arr.shift();
    this.data.set(key, arr);
  }

  stats(key: string): { mean: number; std: number; n: number } {
    const arr = this.data.get(key) ?? [];
    const n = arr.length;
    if (n === 0) return { mean: 0, std: 0, n: 0 };
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    return { mean, std: Math.sqrt(variance), n };
  }
}
