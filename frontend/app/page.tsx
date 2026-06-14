"use client";
import { useState } from "react";
import { useSignals } from "../lib/useSignals";
import { useCountUp, useScrollReveal, sparkBars } from "../lib/landingHooks";
import { LiveLedger } from "../components/LiveLedger";
import { EXPLORER } from "../lib/chain";

const REGISTRY = "0x708dFb5fFea4B0149E6F1714F5A72D5291f0bB5b";
const IDENTITY = "0x3f6a671a81Fc7f24BF378aBCf8E31AD7bEd65250";

/* ---------- proof contract chip with copy ---------- */
function ContractChip({ label, addr }: { label: string; addr: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(addr).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="contract-chip reveal">
      <div className="meta">
        <div className="lbl">{label}</div>
        <div className="addr">{addr}</div>
      </div>
      <div className="acts">
        <button className={`icon-btn${copied ? " copied" : ""}`} onClick={copy} title="Copy address">
          {copied ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
          )}
        </button>
        <a className="icon-btn" href={`${EXPLORER}/address/${addr}`} target="_blank" rel="noopener noreferrer" title="Verify on Mantlescan">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M7 17L17 7M9 7h8v8" /></svg>
        </a>
      </div>
    </div>
  );
}

const DETECTORS = [
  { idx: "DETECTOR 01", title: "Whale Flow", body: "Tracks large net inflows and outflows from a curated set of smart-money wallets — positioning that precedes a move." },
  { idx: "DETECTOR 02", title: "New-Wallet Accumulation", body: "Flags clusters of freshly-funded wallets quietly accumulating the same asset within a tight time window." },
  { idx: "DETECTOR 03", title: "Abnormal Liquidity", body: "Detects sudden LP depth changes or pool-composition shifts across Mantle DEXs before they hit the price." },
  { idx: "DETECTOR 04", title: "Contract-Interaction Spike", body: "Surfaces surges in unique callers hitting a contract method — early adoption visible on-chain first." },
];

const STEPS = [
  { no: 1, glyph: "eth_subscribe", title: "Watch Mantle", body: "Indexes every block, mempool transaction, and tracked smart-money wallet across the Mantle network in real time." },
  { no: 2, glyph: "σ > 3.0", title: "Detect", body: "Four detectors fire when on-chain behaviour crosses a statistical threshold — not vibes, measured anomalies." },
  { no: 3, glyph: "ERC-8004", title: "Write on-chain", body: "The signal is signed under Cassandra's soulbound identity and inscribed to the registry before the outcome is known." },
  { no: 4, glyph: "resolve()", title: "Auto-resolve", body: "After the window closes, an oracle marks the call hit or miss against price. The result is appended — never overwritten." },
];

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export default function Home() {
  useScrollReveal();
  const { calls, loading } = useSignals();

  // Every figure below is derived from real on-chain registry state — no
  // fabricated fallbacks. An empty or young registry is shown honestly:
  // the entire thesis is that the record cannot be faked.
  const resolved = calls.filter((c) => c.status !== 0);
  const hits = resolved.filter((c) => c.status === 1).length;
  const pending = calls.length - resolved.length;
  const hasResolved = resolved.length > 0;

  const hitRate = hasResolved ? (hits / resolved.length) * 100 : 0;

  const avgScore = calls.length
    ? Math.round(calls.reduce((s, c) => s + c.score, 0) / calls.length)
    : null;
  const resolveMins = median(
    resolved.filter((c) => c.resolvedTs).map((c) => (c.resolvedTs! - c.ts) / 60)
  );
  const resolveLabel =
    resolveMins === null
      ? "—"
      : resolveMins < 60
        ? `${Math.round(resolveMins)}m`
        : `${(resolveMins / 60).toFixed(1)}h`;
  const strengthLabel = avgScore !== null ? `${avgScore}/100` : "—";

  const hitCU = useCountUp(hitRate, 1700, 1);
  const inscribedCU = useCountUp(calls.length, 1500, 0);
  const resolvedCU = useCountUp(resolved.length, 1500, 0);

  return (
    <>
      {/* ================= HERO ================= */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Autonomous on-chain alpha · Mantle</span>
            <h1 className="display">
              The record<br />can't be faked<br />
              <span className="serif-em">when it's inscribed.</span>
            </h1>
            <p className="tagline">“The seer whose calls are provable.”</p>
            <p className="lead sub">
              Cassandra writes every trading signal to an immutable on-chain registry — under her own
              ERC-8004 soulbound identity — <em className="gold-text">before the outcome is known.</em>{" "}
              The hit-rate is computed from chain state, not self-reported.
            </p>
            <div className="hero-cta">
              <a className="btn btn-gold" href="#ledger">See the on-chain record <span className="arr">→</span></a>
              <a className="btn btn-ghost" href="#proof">Read a call on Mantle <span className="arr">↗</span></a>
            </div>
            <div className="hero-meta">
              <div className="item">
                <div className="k" ref={inscribedCU.ref as React.RefObject<HTMLDivElement>}>{inscribedCU.text}</div>
                <div className="l">Calls inscribed</div>
              </div>
              <div className="item">
                <div className="k" ref={resolvedCU.ref as React.RefObject<HTMLDivElement>}>{resolvedCU.text}</div>
                <div className="l">Resolved</div>
              </div>
              <div className="item">
                <div className="k">{pending}</div>
                <div className="l">Pending outcome</div>
              </div>
            </div>
          </div>

          <div className="hero-card">
            <div className="lp metric-card">
              <div className="ring" />
              <div className="eyebrow lab" style={{ justifyContent: "center" }}>Provable hit-rate</div>
              {hasResolved ? (
                <>
                  <div className="metric-num gold-grad">
                    <span ref={hitCU.ref as React.RefObject<HTMLSpanElement>}>{hitCU.text}</span>
                    <span className="pct">%</span>
                  </div>
                  <div className="metric-sub">
                    From {resolved.length} resolved · {calls.length} inscribed on-chain
                  </div>
                  <div
                    className="eyebrow"
                    style={{ justifyContent: "center", marginTop: 10, opacity: 0.7, fontStyle: "italic", textTransform: "none", letterSpacing: 0 }}
                  >
                    Recomputed from chain state by anyone — unfakeable, win or lose.
                  </div>
                </>
              ) : (
                <>
                  <div className="metric-num gold-grad" style={{ fontSize: "clamp(2rem,5vw,3rem)" }}>
                    {calls.length}
                  </div>
                  <div className="metric-sub">
                    {calls.length
                      ? `Calls inscribed before outcome · ${pending} awaiting resolution`
                      : "Reading the registry…"}
                  </div>
                </>
              )}
              <div className="metric-foot">
                <div className="c"><div className="v" style={{ color: "var(--hit)" }}>{strengthLabel}</div><div className="t">Avg signal strength</div></div>
                <div className="c"><div className="v">{resolveLabel}</div><div className="t">Median resolve time</div></div>
                <div className="c"><div className="v">0</div><div className="t">Calls edited</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PROBLEM ================= */}
      <section className="sec" id="problem">
        <div className="wrap">
          <div className="rule" />
          <div className="sec-head reveal">
            <span className="eyebrow">The wedge</span>
            <h2 className="section-title">Crypto Twitter is a graveyard of <span className="serif-em">deleted calls.</span></h2>
            <p className="lead">Anyone can claim a 90% hit-rate when the misses get quietly removed. Cassandra removes the human — and the delete button. Every call is a transaction, timestamped on Mantle before the market moves.</p>
          </div>
          <div className="problem-grid">
            <div className="lp contrast bad reveal">
              <span className="tag"><span className="dot" />Unverifiable · off-chain</span>
              <h3>The alpha caller</h3>
              <p>Screenshots, edited threads, survivorship bias. The record lives on a platform that lets you erase it — so it isn't a record at all.</p>
              <div className="demo">
                <div className="tweet">
                  <div className="hd"><div className="av" /><div className="nm">whale_oracle.eth <small>· 0xAlpha</small></div></div>
                  <div className="bd">$XYZ about to send. Loading up here, you'll thank me later. Not financial advice 🔮</div>
                  <div className="del">✕ Post deleted by author · outcome unknown</div>
                </div>
              </div>
            </div>
            <div className="lp contrast good reveal">
              <span className="tag"><span className="dot" />Provable · on-chain</span>
              <h3>Cassandra</h3>
              <p>The signal is signed and inscribed to the registry <em className="gold-text">before</em> resolution. No edit, no delete, no hindsight. The chain keeps the score.</p>
              <div className="demo">
                <div className="receipt">
                  <div className="row"><span className="kk">method</span><span className="vv">inscribeCall()</span></div>
                  <div className="row"><span className="kk">subject</span><span className="vv">cmETH · accumulation</span></div>
                  <div className="row"><span className="kk">block</span><span className="vv">72,481,309</span></div>
                  <div className="row"><span className="kk">tx</span><span className="vv hash">0xa1f9…4c2e</span></div>
                  <div className="stamp">◆ Inscribed before outcome · immutable</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="sec" id="how">
        <div className="wrap">
          <div className="rule" />
          <div className="sec-head reveal">
            <span className="eyebrow">How it works</span>
            <h2 className="section-title">From mempool to permanent record, <span className="serif-em">autonomously.</span></h2>
          </div>
          <div className="flow reveal">
            {STEPS.map((s) => (
              <div className="step" key={s.no}>
                <div className="no">{s.no}</div>
                <span className="glyph">{s.glyph}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= DETECTORS ================= */}
      <section className="sec" id="detectors">
        <div className="wrap">
          <div className="rule" />
          <div className="sec-head reveal">
            <span className="eyebrow">The four detectors</span>
            <h2 className="section-title">She reads the chain, <span className="serif-em">not the chatter.</span></h2>
            <p className="lead">Each detector is an independent signal engine running continuously on Mantle. Every fire becomes a call.</p>
          </div>
          <div className="bento">
            {DETECTORS.map((d, i) => (
              <div className="lp detector reveal" key={d.idx}>
                <div className="dh">
                  <span className="idx">{d.idx}</span>
                  <span className="live"><span className="d" />Armed</span>
                </div>
                <h3>{d.title}</h3>
                <p>{d.body}</p>
                <div className="spark">
                  {sparkBars(i).map((h, j) => (
                    <i key={j} style={{ height: `${h.toFixed(2)}%` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PROOF ================= */}
      <section className="sec" id="proof">
        <div className="wrap">
          <div className="rule" />
          <div className="sec-head reveal">
            <span className="eyebrow">Proof &amp; transparency</span>
            <h2 className="section-title">Don't trust the seer. <span className="serif-em">Verify the ledger.</span></h2>
          </div>
          <div className="proof-grid">
            <div className="lp proof-card reveal">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 12h4l3 8 4-16 3 8h4" /></svg></div>
              <h3>On-chain benchmark</h3>
              <p>Every call is a transaction. The hit-rate is recomputed from chain state by anyone, any time — never self-reported off a private database.</p>
            </div>
            <div className="lp proof-card reveal">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" /><path d="M9 12l2 2 4-4" /></svg></div>
              <h3>ERC-8004 soulbound identity</h3>
              <p>Cassandra signs under a single non-transferable agent identity. Every call is cryptographically attributable — and impossible to launder.</p>
            </div>
            <div className="lp proof-card reveal">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="12" cy="12" r="3" /><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /></svg></div>
              <h3>Live transparency</h3>
              <p>Read, replay and audit the full call history on Mantlescan. The pending calls are visible too — you watch the seer be right or wrong in real time.</p>
            </div>
          </div>
          <div className="contracts">
            <ContractChip label="Registry contract" addr={REGISTRY} />
            <ContractChip label="Identity contract · ERC-8004" addr={IDENTITY} />
          </div>
        </div>
      </section>

      {/* ================= LEDGER ================= */}
      <section className="sec" id="ledger">
        <div className="wrap">
          <div className="rule" />
          <div className="sec-head reveal">
            <span className="eyebrow">Live track record</span>
            <h2 className="section-title">The ledger, <span className="serif-em">as it's written.</span></h2>
            <p className="lead">A live view of the registry. Pending calls resolve themselves as their windows close — watch the score keep itself. Every row links to Mantlescan.</p>
          </div>
          <LiveLedger calls={calls} loading={loading} />
        </div>
      </section>

      {/* ================= CTA BAND ================= */}
      <section className="cta-band">
        <div className="wrap">
          <img className="eye" src="/cassandra-eye.png" alt="" />
          <h2 className="section-title">The calls are already written.<br /><span className="serif-em">Go check.</span></h2>
          <p className="tg">“The seer whose calls are provable.”</p>
          <div className="btns">
            <a className="btn btn-gold" href="#ledger">View the live dashboard <span className="arr">→</span></a>
            <a className="btn btn-ghost" href={`${EXPLORER}/address/${REGISTRY}`} target="_blank" rel="noopener noreferrer">Verify on Mantlescan <span className="arr">↗</span></a>
          </div>
        </div>
      </section>
    </>
  );
}
