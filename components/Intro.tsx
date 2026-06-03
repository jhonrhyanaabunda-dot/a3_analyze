"use client";

import { useCallback, useEffect, useRef } from "react";
import Mascot from "./Mascot";
import CountUp from "./CountUp";

// how long SAGGY keeps talking before going quiet — ~16s = two clean loops of the 8s clip
const TALK_MS = 16000;

export default function Intro({ onStart }: { onStart: () => void }) {
  const heroVid = useRef<HTMLVideoElement>(null);
  const muteTimer = useRef<ReturnType<typeof setTimeout>>();

  // unmute, restart and play SAGGY's line; tap the speaker to hear it again
  const speak = useCallback(() => {
    const v = heroVid.current;
    if (!v) return;
    v.muted = false;
    v.currentTime = 0;
    const p = v.play();
    if (p && p.catch) p.catch(() => { v.muted = true; v.play().catch(() => {}); });
    if (muteTimer.current) clearTimeout(muteTimer.current);
    muteTimer.current = setTimeout(() => { if (heroVid.current) heroVid.current.muted = true; }, TALK_MS);
  }, []);

  // Auto-speak on every page load. Browsers allow unmuted autoplay only once the site has
  // enough engagement / a prior gesture; if this load is blocked we play muted and speak on
  // the first interaction anywhere — so SAGGY talks as soon as the browser permits it.
  useEffect(() => {
    const v = heroVid.current;
    if (!v) return;
    let armed = false;
    const go = () => { off(); speak(); };
    const off = () => {
      if (!armed) return;
      armed = false;
      document.removeEventListener("pointerdown", go);
      document.removeEventListener("touchstart", go);
      document.removeEventListener("keydown", go);
    };
    try {
      v.muted = false;
      v.currentTime = 0;
      const p = v.play();
      if (p && p.then) {
        p.then(() => {
          if (muteTimer.current) clearTimeout(muteTimer.current);
          muteTimer.current = setTimeout(() => { if (heroVid.current) heroVid.current.muted = true; }, TALK_MS);
        }).catch(() => {
          v.muted = true;
          v.play().catch(() => {});
          armed = true;
          document.addEventListener("pointerdown", go, { passive: true });
          document.addEventListener("touchstart", go, { passive: true });
          document.addEventListener("keydown", go);
        });
      }
    } catch { /* ignore */ }
    return () => { off(); if (muteTimer.current) clearTimeout(muteTimer.current); };
  }, [speak]);

  return (
    <section className="stage anim-fade">
      <div className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>
              AI is sending your buyers to 
              <span className="accent"> another dealership.</span> See how many.
            </h1>
            <p className="lede">
              Shoppers now ask ChatGPT, Gemini, and Google&apos;s AI for the best place to buy, and it
              names a dealer. If that isn&apos;t you, the lead never reaches your store. 12 sharp
              questions, two minutes, and a real read on what it&apos;s costing you.
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
              <button className="sound" onClick={speak} aria-label="Hear SAGGY">
                🔊
              </button>
              <Mascot ref={heroVid} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
