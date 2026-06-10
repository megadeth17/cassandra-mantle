import "./globals.css";
import "./landing.css";
import type { ReactNode } from "react";
import { Nav } from "../components/Nav";

const REGISTRY = "0x708dFb5fFea4B0149E6F1714F5A72D5291f0bB5b";
const IDENTITY = "0x3f6a671a81Fc7f24BF378aBCf8E31AD7bEd65250";

export const metadata = {
  title: "Cassandra — the seer whose calls are provable",
  description:
    "Autonomous on-chain alpha agent. Every signal written to Mantle under an ERC-8004 soulbound identity before the outcome is known. The hit-rate is computed from chain state — it cannot be faked.",
  icons: { icon: "/cassandra-logo.png" },
};

function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <a className="brand" href="#top">
              <img src="/cassandra-eye.png" alt="" style={{ height: 34 }} />
              <span className="word">CASSANDRA</span>
            </a>
            <p>
              An autonomous on-chain alpha agent. Every prophecy inscribed in a
              verified ledger, before the outcome is known.
            </p>
          </div>
          <div className="foot-col">
            <h4>Product</h4>
            <a href="#how">How it works</a>
            <a href="#detectors">Detectors</a>
            <a href="#proof">Proof</a>
            <a href="#ledger">Track record</a>
          </div>
          <div className="foot-col">
            <h4>Verify</h4>
            <a href="https://mantlescan.xyz" target="_blank" rel="noopener noreferrer">Mantlescan ↗</a>
            <a href={`https://mantlescan.xyz/address/${REGISTRY}`} target="_blank" rel="noopener noreferrer">Registry contract</a>
            <a href={`https://mantlescan.xyz/address/${IDENTITY}`} target="_blank" rel="noopener noreferrer">Identity contract</a>
            <a href="#ledger">Live dashboard</a>
          </div>
          <div className="foot-col">
            <h4>Contracts</h4>
            <div className="foot-addr">
              <div><span className="k">REGISTRY</span></div>
              <div className="a">0x708dFb5f…91f0bB5b</div>
              <div style={{ height: 8 }} />
              <div><span className="k">IDENTITY</span></div>
              <div className="a">0x3f6a671a…bEd65250</div>
            </div>
          </div>
        </div>
        <div className="foot-bot">
          <span className="built">Built on <b>Mantle</b> · ERC-8004 soulbound identity</span>
          <span>Turing Test Hackathon 2026 · © Cassandra</span>
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Nav />
        <main id="top">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
