"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Lead, RealData } from "@/lib/types";
import { QUESTIONS, PILLAR_META, SEGMENTS } from "@/lib/questions";
import { BENCHMARK, CALENDLY_URL, computeQuizScore, getSegment, percentile, tierFor, tone } from "@/lib/scoring";
import { downloadReportPdf } from "@/lib/pdf";
import CountUp from "./CountUp";
import Mascot from "./Mascot";

const RING_R = 86;
const RING_C = 2 * Math.PI * RING_R;

export default function Results({
  answers,
  lead,
  real,
  onRetake,
}: {
  answers: (number | null)[];
  lead: Lead | null;
  real: RealData | null;
  onRetake: () => void;
}) {
  const pct = real ? real.overall : computeQuizScore(answers);
  const tn = tone(pct);
  const tier = tierFor(pct);
  const seg = getSegment(answers);
  // real, market-specific average from Gemini when available; else the configured fallback
  const avg = real?.ai?.market_average ?? BENCHMARK;

  const sectionRef = useRef<HTMLElement>(null);
  const ctaVid = useRef<HTMLVideoElement>(null);
  const [offset, setOffset] = useState(RING_C);
  const [youLeft, setYouLeft] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const rv = (base: string, order: number) => ({
    className: `${base} reveal${revealed ? " inview" : ""}`,
    style: { transitionDelay: `${order * 0.12}s` } as React.CSSProperties,
  });

  // weakest pillar (from quiz answers) for the CTA nudge
  const weakest = useMemo(() => {
    const pill: Record<string, { s: number; n: number }> = {
      SEARCH: { s: 0, n: 0 },
      DATA: { s: 0, n: 0 },
      LOCAL: { s: 0, n: 0 },
    };
    QUESTIONS.forEach((Q, i) => {
      if (Q.p !== "SEGMENT" && pill[Q.p] && answers[i] != null) {
        pill[Q.p].s += (answers[i] as number) + 1;
        pill[Q.p].n++;
      }
    });
    let w: string | null = null;
    let wv = Infinity;
    Object.keys(pill).forEach((k) => {
      if (pill[k].n) {
        const v = pill[k].s / (pill[k].n * 4);
        if (v < wv) {
          wv = v;
          w = k;
        }
      }
    });
    return w as keyof typeof PILLAR_META | null;
  }, [answers]);

  // ring + benchmark marker animation
  useEffect(() => {
    const t1 = setTimeout(() => setOffset(RING_C * (1 - pct / 100)), 120);
    const t2 = setTimeout(() => setYouLeft(pct), 220);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pct]);

  // sequenced reveal: sections cascade in top-to-bottom after the score animates
  useEffect(() => {
    const r = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(r);
  }, []);

  // Saggy speaks once on the results screen (this mounts right after the submit gesture)
  useEffect(() => {
    const v = ctaVid.current;
    if (!v) return;
    try {
      v.muted = false;
      v.currentTime = 0;
      const p = v.play();
      if (p && p.catch) p.catch(() => { v.muted = true; });
    } catch { /* ignore */ }
    const t = setTimeout(() => { if (v) v.muted = true; }, 8300);
    return () => clearTimeout(t);
  }, []);

  const greet = lead?.name ? lead.name.split(" ")[0].replace(/^./, (c) => c.toUpperCase()) + ", " : "";
  const liveSummary = real?.ai?.summary || "";
  const dateStr = useMemo(() => {
    try {
      return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch {
      return "";
    }
  }, []);

  // benchmark delta
  const delta = pct - avg;
  const dColor = delta >= 8 ? "#1DB954" : delta <= -25 ? "#EF4444" : delta <= -8 ? "#F59E0B" : "#8A919C";
  const bmNote =
    delta >= 8 ? (
      <>You&apos;re <b style={{ color: dColor }}>{delta} points above</b> the average dealer in your segment. You&apos;re ahead, and that lead is yours to protect.</>
    ) : delta <= -8 ? (
      <>You&apos;re <b style={{ color: dColor }}>{Math.abs(delta)} points below</b> the average dealer in your segment. That gap is visible to shoppers every day, and closeable.</>
    ) : (
      <>You&apos;re right around the segment average of <b style={{ color: dColor }}>{avg}</b>. &quot;Average&quot; is exactly where competitors with momentum overtake you.</>
    );

  // opportunity / live tiles
  const upside = 100 - pct;
  const behind = Math.max(0, avg - pct);
  const tiles: { node: React.ReactNode; cap: string }[] = real
    ? (() => {
        const aiScore = real.ai ? (real.ai.ai_score != null ? real.ai.ai_score : real.ai.score) : null;
        const localScore = real.ai ? real.ai.local_score : null;
        const first =
          real.siteHealth != null
            ? { node: <CountUp value={real.siteHealth} duration={1100} />, cap: "Live on-page SEO health score" }
            : localScore != null
            ? { node: <CountUp value={localScore} duration={1100} />, cap: "Local & reviews presence (live web)" }
            : { node: <CountUp value={upside} duration={1100} />, cap: "Points of visibility upside on the table" };
        return [
          first,
          {
            node: aiScore != null ? <CountUp value={aiScore} duration={1100} /> : <CountUp value={upside} duration={1100} />,
            cap: aiScore != null ? "Visibility in AI & search recommendations" : "Points of visibility upside on the table",
          },
          {
            node: real.ai && real.ai.foundInAI ? "✓" : "✗",
            cap: "Cited when shoppers ask AI for the best dealer",
          },
        ];
      })()
    : [
        { node: <CountUp value={upside} duration={1100} />, cap: "Points of visibility upside still on the table" },
        behind > 0
          ? { node: <CountUp value={behind} duration={1100} />, cap: "Points behind your market average today" }
          : { node: "✓", cap: "You're at or above your market average" },
        { node: <>90<small style={{ fontSize: 18 }}>d</small></>, cap: "Typical A3 timeline to close your biggest gaps" },
      ];

  const ctaHead = seg && SEGMENTS[seg] ? SEGMENTS[seg].head : "Want us to close these gaps for you?";

  // percentile framing (relative to this market's average)
  const P = percentile(pct, avg);
  const pctChip = P >= 50 ? `Top ${100 - P}%` : `Bottom ${P}%`;
  const pctSentence =
    P >= 50
      ? `You rank ahead of ${P}% of the dealers we've analyzed.`
      : `You're ahead of just ${P}% of the dealers we've analyzed.`;

  // "what shoppers see" mock
  const found = !!real?.ai?.foundInAI;
  const dealerName = lead?.dealership || "Your dealership";
  const cityName = lead?.city || "your market";

  const makePdf = () => {
    downloadReportPdf({
      score: pct,
      color: tn.c,
      tierLabel: tier.b,
      tierTitle: greet + tier.t.charAt(0).toLowerCase() + tier.t.slice(1),
      summary: liveSummary,
      percentileSentence: pctSentence,
      benchmark: avg,
      lead,
      real,
      calendly: CALENDLY_URL,
    }).catch(() => {});
  };

  const bookCall = () => {
    const params = new URLSearchParams();
    if (lead) {
      params.set("name", lead.name);
      params.set("email", lead.email);
    }
    params.set("a1", `Visibility Score: ${pct}/100${seg ? " · Focus: " + seg : ""}`);
    const url = CALENDLY_URL + (CALENDLY_URL.includes("?") ? "&" : "?") + params.toString();
    window.open(url, "_blank", "noopener");
  };

  return (
    <section className="stage anim-left" id="results" ref={sectionRef}>
      <div className="result-head">
        <div className="score-glow" style={{ background: `radial-gradient(circle, ${tn.c} 0%, transparent 70%)` }} />
        <div className="rep-head">
          Visibility Report &nbsp;·&nbsp; <b>{lead?.dealership || "Your dealership"}</b>
          {dateStr ? <> &nbsp;·&nbsp; {dateStr}</> : null}
        </div>
        <div className="score-ring">
          <svg width="200" height="200">
            <circle cx="100" cy="100" r={RING_R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
            <circle
              className="arc-spin"
              cx="100"
              cy="100"
              r={RING_R}
              fill="none"
              stroke={tn.c}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={offset}
              style={{ filter: `drop-shadow(0 0 16px ${tn.c}88)`, transition: "stroke-dashoffset 900ms cubic-bezier(.2,.7,.2,1)" }}
            />
          </svg>
          <div className="val">
            <div className="num" style={{ color: tn.c }}>
              <CountUp value={pct} duration={1100} />
            </div>
            <div className="den">Visibility Score</div>
          </div>
        </div>
        <div>
          <span className="tier-badge" style={{ background: tn.c, color: "#fff", boxShadow: `0 4px 24px ${tn.c}55` }}>
            {tier.b}
          </span>
        </div>
        <h2>{greet + tier.t.charAt(0).toLowerCase() + tier.t.slice(1)}</h2>
        <p>{liveSummary ? liveSummary + " " + tier.d : tier.d}</p>
        <div className="pct">
          <span className="chip" style={{ color: tn.c, background: tn.bg }}>{pctChip}</span>
          <span>{pctSentence}</span>
        </div>
      </div>

      <div {...rv("benchmark", 0)}>
        <div className="bm-row">
          <span>0</span>
          <span>
            Your market average: <b>{avg}</b>
          </span>
          <span>100</span>
        </div>
        <div className="bm-track">
          <div className="bm-avg" style={{ left: `${avg}%` }} />
          <div className="bm-you" style={{ left: `${youLeft}%`, background: tn.c, boxShadow: `0 0 12px ${tn.c}` }} />
        </div>
        <div className="bm-note">{bmNote}</div>
      </div>

      {real && (
        <div {...rv("serp-mock", 1)}>
          <div className="sm-head">When a shopper asks AI for the best dealer in {cityName}…</div>
          <div className="sm-bubble">
            <div className="sm-q">💬 &ldquo;Best place to buy a car near {cityName}?&rdquo;</div>
            <div className="sm-ai">
              <span className="dot">AI</span>
              <div className="sm-a">
                {found ? (
                  <>Top recommendations include <b>{dealerName}</b>, noted for its reviews and local presence.</>
                ) : (
                  <>Top recommendations point shoppers to several nearby dealers. <b>{dealerName}</b> isn&apos;t currently surfaced in the answer.</>
                )}
              </div>
            </div>
            <div className={`sm-verdict ${found ? "good" : "bad"}`}>
              {found ? "✓ You're being recommended" : "✗ You're not in the conversation"}
            </div>
          </div>
        </div>
      )}

      <div {...rv("eyebrow", 2)}>{real ? "What we found in your live data" : "The opportunity on the table"}</div>
      <div {...rv("proj", 3)}>
        {tiles.map((t, i) => (
          <div className="tile" key={i}>
            <div className="big">{t.node}</div>
            <div className="cap">{t.cap}</div>
          </div>
        ))}
      </div>

      <div {...rv("cta-band", 4)}>
        <div className="cta-text">
          <span className="urgency">
            ●&nbsp; {weakest ? <>Start here: <b>{PILLAR_META[weakest].label}</b></> : "Your biggest opportunity right now"}
          </span>
          <h3>{ctaHead}</h3>
          <p>
            Book a strategy call and we&apos;ll walk your real numbers, your Brand DNA, and a 90-day plan
            to outrank your market.
          </p>
          <div className="cta-row">
            <button className="btn btn-primary" onClick={bookCall}>
              BOOK A STRATEGY CALL
            </button>
            <button className="btn btn-ghost" onClick={makePdf}>
              ⤓ Download PDF report
            </button>
            <button className="btn btn-ghost" onClick={onRetake}>
              Retake
            </button>
          </div>
        </div>
        <div className="cta-mascot">
          <Mascot ref={ctaVid} />
        </div>
      </div>

      <div className="footnote">A3 Brands · Automotive SEO &amp; Dealer Performance · The numbers don&apos;t lie.</div>
    </section>
  );
}
