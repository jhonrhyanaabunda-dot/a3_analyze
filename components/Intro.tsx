"use client";

import { useRef } from "react";
import Mascot from "./Mascot";
import CountUp from "./CountUp";

export default function Intro({ onStart }: { onStart: () => void }) {
  const heroVid = useRef<HTMLVideoElement>(null);
  const soundRef = useRef<HTMLButtonElement>(null);

  const toggleSound = () => {
    const v = heroVid.current;
    if (!v) return;
    v.muted = !v.muted;
    if (soundRef.current) soundRef.current.textContent = v.muted ? "🔇" : "🔊";
    if (!v.muted) v.play().catch(() => {});
  };

  return (
    <section className="stage anim-fade">
      <div className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>
              Your competitors are winning the
              <br />
              <span className="accent">search results.</span> We fix that.
            </h1>
            <p className="lede">
              12 sharp questions. Two minutes. A real read on where your dealership is losing
              visibility, across Google, your OEM site, local pack, and the AI engines shoppers now
              ask first.
            </p>
            <div className="stats">
              <div className="stat">
                <div className="n">
                  <CountUp value={12} duration={700} />
                </div>
                <div className="l">Diagnostic questions</div>
              </div>
              <div className="stat">
                <div className="n">
                  <CountUp value={3} duration={700} />
                </div>
                <div className="l">Visibility pillars scored</div>
              </div>
              <div className="stat">
                <div className="n">
                  <CountUp value={2} duration={700} />
                  <span style={{ fontSize: 18 }}>min</span>
                </div>
                <div className="l">To your custom report</div>
              </div>
            </div>
            <button className="btn btn-primary" onClick={onStart}>
              START THE ANALYSIS &rarr;
            </button>
            <div className="reassure">
              <span>
                <span className="ck">✓</span> No payment, no obligation
              </span>
              <span>
                <span className="ck">✓</span> Built for franchise &amp; OEM dealers
              </span>
              <span>
                <span className="ck">✓</span> Instant personalized report
              </span>
            </div>
          </div>
          <div className="hero-mascot">
            <div className="mascot-frame">
              <button ref={soundRef} className="sound" onClick={toggleSound} aria-label="Toggle sound">
                🔇
              </button>
              <Mascot ref={heroVid} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
