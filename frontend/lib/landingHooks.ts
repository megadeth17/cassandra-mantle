"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Count-up that fires once the element scrolls into view.
 * Returns a ref to attach and the current animated value.
 */
export function useCountUp(end: number, duration = 1600, decimals = 0) {
  const ref = useRef<HTMLElement | null>(null);
  const [value, setValue] = useState(0);
  const inView = useRef(false);

  // Observe once: mark when the element is on screen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) inView.current = true; }),
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Animate toward `end` whenever it changes (handles async on-chain data that
  // loads after the element is already in view). Waits until on screen.
  // A timeout fallback snaps to the final value even if rAF is throttled
  // (background tabs / headless), so the honest number always renders.
  useEffect(() => {
    let raf = 0;
    let t0: number | null = null;
    const tick = (now: number) => {
      if (!inView.current) { raf = requestAnimationFrame(tick); return; }
      if (t0 === null) t0 = now;
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(end * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setValue(end);
    };
    raf = requestAnimationFrame(tick);
    const settle = setTimeout(() => setValue(end), duration + 150);
    return () => { cancelAnimationFrame(raf); clearTimeout(settle); };
  }, [end, duration]);

  const text =
    decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString();
  return { ref, value, text };
}

/**
 * Adds the `in` class to every `.reveal` element as it scrolls into view.
 * Call once near the top of the page component.
 */
export function useScrollReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (els.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            el.style.transitionDelay = Math.min(i, 4) * 60 + "ms";
            el.classList.add("in");
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

/** Deterministic sparkline bar heights (percentages) for a detector card. */
export function sparkBars(seedIdx: number, n = 28): number[] {
  let seed = seedIdx * 7 + 3;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const bars: number[] = [];
  for (let i = 0; i < n; i++) {
    const base = 18 + Math.sin(i / 2.4 + seedIdx) * 12;
    bars.push(Math.max(8, Math.min(100, base + rnd() * 54)));
  }
  return bars;
}
