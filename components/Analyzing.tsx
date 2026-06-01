"use client";

import { useEffect, useState } from "react";
import Mascot from "./Mascot";

const STEPS = [
  "Scanning your website",
  "Auditing your on-page SEO signals",
  "Asking AI engines if shoppers find you",
  "Scoring your real visibility",
];

export default function Analyzing() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActive((a) => (a < STEPS.length - 1 ? a + 1 : a));
    }, 1600);
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
    </section>
  );
}
