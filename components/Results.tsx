"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Lead, RealData } from "@/lib/types";
import { QUESTIONS, PILLAR_META, SEGMENTS } from "@/lib/questions";
import { bandFor, BENCHMARK, CALENDLY_URL, computeQuizScore, getSegment, lostBuyersRange, percentile, tierFor, tone } from "@/lib/scoring";
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
  onViewEvidence,
}: {
  answers: (number | null)[];
  lead: Lead | null;
  real: RealData | null;
  onRetake: () => void;
  onViewEvidence?: () => void;
}) {
  const pct = real ? real.overall : computeQuizScore(answers);
  const tn = tone(pct);
  const tier = tierFor(pct);
  const band = bandFor(pct);
  // how far the rocket travelled toward the moon (kept just shy of the moon at 100)
  const journeyPos = 6 + (pct / 100) * 82;
  const seg = getSegment(answers);
  // real, market-specific average from Gemini when available; else the configured fallback
  const avg = real?.ai?.market_average ?? BENCHMARK;

  const sectionRef = useRef<HTMLElement>(null);
  const ctaVid = useRef<HTMLVideoElement>(null);
  const [offset, setOffset] = useState(RING_C);
  const [youLeft, setYouLeft] = useState(0);
  const [climb, setClimb] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showMethod, setShowMethod] = useState(false);
  const [showSticky, setShowSticky] = useState(false);
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
    const t3 = setTimeout(() => setClimb(true), 320);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pct]);

  // sequenced reveal: sections cascade in top-to-bottom after the score animates
  useEffect(() => {
    const r = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(r);
  }, []);

  // sticky CTA bar appears once the hero/score has scrolled past
  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 440);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
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
            cap: "Shows up in Google search for the best dealer",
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

  // live Google rating + reviews (only shown when the live lookup returned them)
  const rating = real?.ai?.rating ?? null;
  const reviewCount = real?.ai?.review_count ?? null;
  const showReviews = rating != null;
  const fullStars = rating != null ? Math.max(0, Math.min(5, Math.round(rating))) : 0;

  // real competitors from the live scan (never invented; empty when the scan found none)
  const rivals = (real?.ai?.competitors ?? []).filter((c) => c && c.name).slice(0, 2);
  const primaryRival = rivals[0] || null;

  // score-adaptive, search-accurate hero (no AI overclaim — Gemini is off, so we only claim search)
  const firstName = (lead?.name || "").trim().split(/\s+/)[0]?.replace(/^./, (c) => c.toUpperCase()) || "";
  const strong = pct >= 70;
  const heroEyebrow = strong && !primaryRival && found ? "Your visibility is strong" : "The real cost of your visibility gap";
  const heroTitle = primaryRival
    ? `${primaryRival.name} is showing up before you in ${cityName}.`
    : real && !found
    ? `${dealerName} isn't showing up for ${cityName} buyers.`
    : strong
    ? `${firstName ? firstName + ", you" : "You"}'re showing up first in ${cityName}.`
    : `Are you showing up when ${cityName} shoppers search?`;
  // one-line factual verdict shown up top, before the scroll
  const verdict = primaryRival
    ? `You're being out-ranked in ${cityName} dealer search — see who, and what it's costing you.`
    : real && !found
    ? `You're not showing up in ${cityName} dealer search yet — here's the gap to close.`
    : strong
    ? `You rank near the top of ${cityName} dealer search — strong, with a lead to defend.`
    : `You're mid-pack in ${cityName} dealer search — real room to climb.`;

  // lost leads — ranged, from the scan's REAL search demand only (never invented; in leads, not $)
  const lostLeads = lostBuyersRange(pct, real?.ai?.local_search_volume);
  // proof is only honest when the live scan actually found a rival above you or your absence
  const showProof = !!real && (!!primaryRival || !found);

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
      {/* report header + the AI-pain hero (lead with the pain) */}
      <div className="result-head">
        <div className="score-glow" style={{ background: `radial-gradient(circle, ${tn.c} 0%, transparent 70%)` }} />
        <div className="rep-head">
          Visibility Report &nbsp;·&nbsp; <b>{lead?.dealership || "Your dealership"}</b>
          {dateStr ? <> &nbsp;·&nbsp; {dateStr}</> : null}
        </div>
        <div className="result-verdict">{verdict}</div>
        <div className="ai-hero">
          <div className="ai-hero-eyebrow">●&nbsp; {heroEyebrow}</div>
          <h2 className="ai-hero-title">{heroTitle}</h2>
          <p className="ai-hero-body">
            {primaryRival ? (
              <>
                Right now, when a shopper searches for the best dealer in {cityName},{" "}
                <b>{primaryRival.name}</b> shows up before you, not {dealerName}. Those are buyers who never
                call you and never reach your lot.
              </>
            ) : real && !found ? (
              <>
                When shoppers search for the best dealer in {cityName}, your store isn&apos;t on the list.
                Every one of those is a lead landing with a competitor instead of in your CRM.
              </>
            ) : strong ? (
              <>
                When shoppers search for the best dealer in {cityName}, {dealerName} is showing up, ahead of
                most of your market. The opportunity now is defending that lead before a competitor closes the gap.
              </>
            ) : (
              <>
                When shoppers search for the best dealer in {cityName}, you&apos;re in the mix but not on top.
                Every spot you climb is a buyer who picks you instead of the store down the street.
              </>
            )}
          </p>
        </div>
      </div>

      {/* the proof — the real AI answer for their market, and the leads it routes away */}
      {showProof && (
        <div {...rv("proof-panel", 0)}>
          <div className="proof-card">
            <div className="proof-eyebrow">●&nbsp; The proof</div>
            <div className="proof-head">We searched for the best dealer in {cityName}. Here&apos;s who came up:</div>
            <div className="proof-bubble">
              <div className="proof-ai">
                <span className="dot">SERP</span>
                <div className="proof-a">
                  {primaryRival ? (
                    <>
                      <b>{primaryRival.name}</b>
                      {rivals[1] ? <> and <b>{rivals[1].name}</b></> : null} rank above you.
                    </>
                  ) : (
                    <>Several nearby dealers rank above you.</>
                  )}
                </div>
              </div>
              <div className="proof-verdict">✗ {dealerName} isn&apos;t at the top.</div>
            </div>
            {lostLeads && (
              <p className="proof-leads">
                That answer reaches an estimated <b>{lostLeads.lo} to {lostLeads.hi}</b> buyers a month searching
                your market &mdash; roughly <b>{lostLeads.lo * 12} to {lostLeads.hi * 12} a year</b> &mdash; and
                right now they&apos;re pointed to {primaryRival ? primaryRival.name : "a competitor"}, not you.
              </p>
            )}
            <div className="proof-note">Based on live search results and demand for your market.</div>
          </div>
        </div>
      )}

      {/* the score behind it (supporting proof) */}
      <div className="result-head">
        <div className="eyebrow">The visibility score behind it</div>
        <div className="scan-stamp">
          ●&nbsp; Live scan{dateStr ? <> · {dateStr}</> : null} ·{" "}
          <button type="button" className="method-toggle" onClick={() => setShowMethod((s) => !s)}>
            How we measure this {showMethod ? "▴" : "▾"}
          </button>
        </div>
        {showMethod && (
          <div className="method-note">
            On-page SEO is measured live from your website. AI &amp; search visibility and local presence are
            derived from live Google search results for {cityName}. We only report what the scan can actually
            show you — no invented numbers.
          </div>
        )}
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
        <div className="journey" aria-label={`Your rocket reached ${band.name}`}>
          <div className="journey-rail">
            <div className="rr-moon" />
            <div className="rr-line" />
            <div className="rr-trail" style={{ height: `${climb ? journeyPos : 6}%` }} />
            <div className="rr-rocket" style={{ bottom: `${climb ? journeyPos : 6}%` }} aria-hidden="true">
              🚀
            </div>
            <div className="rr-ground" />
          </div>
          <ul className="journey-bands">
            {["Lunar Leader", "In Orbit", "Liftoff", "Grounded"].map((name) => (
              <li key={name} className={name === band.name ? "active" : ""}>
                {name}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <span className="tier-badge" style={{ background: tn.c, color: "#fff", boxShadow: `0 4px 24px ${tn.c}55` }}>
            {band.name} &nbsp;·&nbsp; {band.blurb}
          </span>
        </div>
        <h2>{greet + tier.t.charAt(0).toLowerCase() + tier.t.slice(1)}</h2>
        <p>{liveSummary ? liveSummary + " " + tier.d : tier.d}</p>
        <div className="pct">
          <span className="chip" style={{ color: tn.c, background: tn.bg }}>{pctChip}</span>
          <span>{pctSentence}</span>
        </div>
      </div>

      <div {...rv("benchmark", 1)}>
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

      {real && found && !primaryRival && (
        <div {...rv("serp-mock", 2)}>
          <div className="sm-head">When a shopper searches Google for the best dealer in {cityName}…</div>
          <div className="sm-bubble">
            <div className="sm-q">💬 &ldquo;Best place to buy a car near {cityName}?&rdquo;</div>
            <div className="sm-ai">
              <span className="dot">Google</span>
              <div className="sm-a">
                <b>{dealerName}</b> shows up among the top results, noted for its reviews and local presence.
              </div>
            </div>
            <div className="sm-verdict good">✓ You&apos;re showing up in search</div>
          </div>
        </div>
      )}

      {showReviews && (
        <div {...rv("reviews", 3)}>
          <div className="rv-card">
            <div className="rv-stars" aria-label={`${rating} out of 5 stars`}>
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className={i < fullStars ? "on" : "off"}>
                  ★
                </span>
              ))}
            </div>
            <div className="rv-meta">
              <span className="rv-num">{rating!.toFixed(1)}</span>
              {reviewCount != null && (
                <span className="rv-count">from {reviewCount.toLocaleString()} Google reviews</span>
              )}
            </div>
            <div className="rv-note">
              Shoppers compare reviews before they ever call. This is the first impression {dealerName} makes
              in the search results.
            </div>
          </div>
        </div>
      )}

      <div {...rv("eyebrow", 4)}>{real ? "What we found in your live data" : "The opportunity on the table"}</div>
      <div {...rv("proj", 5)}>
        {tiles.map((t, i) => (
          <div className="tile" key={i}>
            <div className="big">{t.node}</div>
            <div className="cap">{t.cap}</div>
          </div>
        ))}
      </div>

      <div {...rv("trust-strip", 6)}>
        <span><b>Real data</b>, not guesswork</span>
        <span className="ts-dot" aria-hidden="true">·</span>
        <span>Built for <b>franchise &amp; OEM</b> dealers</span>
        <span className="ts-dot" aria-hidden="true">·</span>
        <span><b>90-day</b> plan to outrank your market</span>
      </div>

      <div {...rv("cta-band", 7)}>
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
            <button className="btn btn-ghost" onClick={onViewEvidence ?? makePdf}>
              🔍 View real evidence →
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

      {/* sticky CTA that follows on scroll so the action is always one tap away */}
      <div className={`result-sticky${showSticky ? " show" : ""}`}>
        <div className="rs-score" style={{ color: tn.c }}>
          {pct}<span>/100</span>
        </div>
        <div className="rs-label">
          Visibility score &middot; <b>{dealerName}</b>
        </div>
        <button className="btn btn-primary" onClick={bookCall}>
          Book a strategy call
        </button>
      </div>
    </section>
  );
}
