"use client";

import { useEffect, useState } from "react";
import Mascot from "./Mascot";

const STEPS = [
  "Scanning your website",
  "Auditing your on-page SEO signals",
  "Asking AI engines if shoppers find you",
  "Scoring your real visibility",
];

// pillar-by-pillar progress text that cycles beneath the orbiting rocket
const PILLARS = [
  "Scanning your search visibility…",
  "Checking AI engine mentions…",
  "Measuring local pack position…",
  "Reading your Brand DNA signals…",
];

export default function Analyzing({ launching = false }: { launching?: boolean }) {
  const [active, setActive] = useState(0);
  const [pillar, setPillar] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActive((a) => (a < STEPS.length - 1 ? a + 1 : a));
    }, 1600);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setPillar((p) => (p + 1) % PILLARS.length), 1700);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="stage anim-left">
      <div className="card analyzing-card">
        <div className="an-mascot">
          <Mascot />
        </div>
        <div className="an-body">
          <span className="qnum">Live analysis</span>
          <h2 className="an-title">Pulling your real visibility data…</h2>
          <div className="an-steps">
            {STEPS.map((s, i) => {
              const cls = i < active ? "done" : i === active ? "active" : "";
              return (
                <div key={i} className={`an-step ${cls}`}>
                  <span className="dot">
                    {i < active ? "✓" : i === active ? <span className="spin" /> : null}
                  </span>
                  <span>{s}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`scan-orbit${launching ? " launching" : ""}`} aria-hidden="true">
        <div className="scan-caption">
          {launching ? <b>Report ready — to the moon! 🌙</b> : PILLARS[pillar]}
        </div>
        <div className="orbit-track">
          <div className="orbit-rocket">
            <div className="rocket-scale">
              <div className="rocket-craft">
                {/* animated turbo exhaust plume + core glow streaming left from the nozzle */}
                <span className="r-plume" />
                <span className="r-turbo" />
                {/* SAGGY piloting the rocket — single illustration */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="rocket-img" src="/saggy_rocketship.png" alt="SAGGY piloting the rocket" />
                {/* sparks streaming back from the nozzle */}
                <span className="r-spk r-spk1" />
                <span className="r-spk r-spk2" />
                <span className="r-spk r-spk3" />
                <span className="r-spk r-spk4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
