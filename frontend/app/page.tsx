"use client";
import { useSignals } from "../lib/useSignals";
import { HitRate } from "../components/HitRate";
import { CallLedger } from "../components/CallLedger";
import { ThinkingFeed } from "../components/ThinkingFeed";

export default function Home() {
  const { calls, loading } = useSignals();
  return (
    <main>
      <header className="text-center pt-16">
        <h1 className="font-display text-oracle" style={{ fontSize: "clamp(2.5rem,8vw,5rem)" }}>CASSANDRA</h1>
        <p className="font-mono text-ink-dim">the seer whose calls are provable</p>
      </header>
      <HitRate calls={calls} />
      <ThinkingFeed />
      {loading ? <p className="text-center text-ink-dim">reading the chain…</p> : <CallLedger calls={calls} />}
    </main>
  );
}
