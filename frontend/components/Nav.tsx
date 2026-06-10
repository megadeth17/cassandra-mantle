"use client";
import { useEffect, useState } from "react";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toLedger = () =>
    document.getElementById("ledger")?.scrollIntoView({ behavior: "smooth" });

  return (
    <nav className={`nav${scrolled ? " scrolled" : ""}`}>
      <div className="wrap nav-inner">
        <a className="brand" href="#top">
          <img src="/cassandra-eye.png" alt="Cassandra" />
          <span className="word">CASSANDRA</span>
        </a>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#detectors">Detectors</a>
          <a href="#proof">Proof</a>
          <a href="#ledger">Track record</a>
        </div>
        <div className="nav-cta">
          <a className="btn btn-gold" href="#ledger">
            <span className="live-dot" />
            View live dashboard
          </a>
          <button className="btn btn-ghost menu-btn" aria-label="menu" onClick={toLedger}>
            ☰
          </button>
        </div>
      </div>
    </nav>
  );
}
