"use client";

import { useEffect, useMemo } from "react";
import type { Lead, RealData } from "@/lib/types";
import { CALENDLY_URL, computeQuizScore, getSegment, tierFor, tone } from "@/lib/scoring";
import { downloadReportPdf } from "@/lib/pdf";

type Sig = { sev: "bad" | "warn" | "good"; text: string };

export default function Evidence({
  answers,
  lead,
  real,
  onBack,
}: {
  answers: (number | null)[];
  lead: Lead | null;
  real: RealData | null;
  onBack: () => void;
}) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const dealerName = lead?.dealership || "Your dealership";
  const dateStr = useMemo(() => {
    try {
      return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch {
      return "";
    }
  }, []);

  const ai = real?.ai ?? null;
  const rating = ai?.rating ?? null;
  const reviewCount = ai?.review_count ?? null;
  const gbp = ai?.gbp ?? null;

  // A.2 — how the score was built (only pillars we actually measured)
  const pillars = [
    { label: "On-page SEO", val: real?.siteHealth ?? null },
    { label: "AI & search visibility", val: ai?.ai_score ?? null },
    { label: "Local & reviews", val: ai?.local_score ?? null },
  ].filter((p) => p.val != null) as { label: string; val: number }[];

  // A.3 — real competitors outranking them
  const rivals = (ai?.competitors ?? []).filter((c) => c && c.name).slice(0, 3);

  // A.4 — signals derived from REAL on-page checks + AI presence (never invented)
  const signals: Sig[] = useMemo(() => {
    const out: Sig[] = [];
    const c = real?.site?.checks;
    if (c) {
      out.push(
        c.schema
          ? { sev: "good", text: "Structured data found, so Google and AI can read your inventory." }
          : { sev: "bad", text: "No structured data (schema) on your homepage, so AI can't read your inventory." }
      );
      if (!c.https) out.push({ sev: "bad", text: "Your site isn't fully secure (no HTTPS), which costs you ranking and trust." });
      if (!c.viewport) out.push({ sev: "bad", text: "Your homepage isn't mobile-ready, where most car shoppers start." });
      if (!c.description) out.push({ sev: "warn", text: "Your homepage is missing a search description, so your listing shows weaker copy." });
      if (!c.title) out.push({ sev: "warn", text: "Your homepage title tag is weak, which Google leans on to rank you." });
      if (c.https && c.viewport && c.title) out.push({ sev: "good", text: "Your site is secure, mobile-ready, and titled, the technical basics are in place." });
    }
    if (ai) {
      out.push(
        ai.foundInAI
          ? { sev: "good", text: "You're surfaced when shoppers ask AI for the best dealer in your market." }
          : { sev: "warn", text: "You're absent from Google AI Overviews and AI recommendations for your market." }
      );
    }
    // bad first, then warn, then good; cap at 4
    const order = { bad: 0, warn: 1, good: 2 } as const;
    return out.sort((a, b) => order[a.sev] - order[b.sev]).slice(0, 4);
  }, [real, ai]);

  const hasCards = rating != null || reviewCount != null || gbp != null;
  const hasAnything = hasCards || pillars.length > 0 || rivals.length > 0 || signals.length > 0;

  const gbpTone = gbp === "Active" ? "#1DB954" : gbp === "Incomplete" ? "#F59E0B" : "#EF4444";

  const makePdf = () => {
    const pct = real ? real.overall : computeQuizScore(answers);
    const tn = tone(pct);
    const tier = tierFor(pct);
    const greet = lead?.name ? lead.name.split(" ")[0].replace(/^./, (ch) => ch.toUpperCase()) + ", " : "";
    downloadReportPdf({
      score: pct,
      color: tn.c,
      tierLabel: tier.b,
      tierTitle: greet + tier.t.charAt(0).toLowerCase() + tier.t.slice(1),
      summary: ai?.summary || "",
      percentileSentence: "",
      benchmark: ai?.market_average ?? 58,
      lead,
      real,
      calendly: CALENDLY_URL,
    }).catch(() => {});
  };

  const bookCall = () => {
    const pct = real ? real.overall : computeQuizScore(answers);
    const seg = getSegment(answers);
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
    <section className="stage anim-left evidence" id="evidence">
      <div className="ev-head">
        <div className="ev-eyebrow">●&nbsp; Real evidence</div>
        <h2 className="ev-title">Here&apos;s exactly how {dealerName} shows up right now.</h2>
        <div className="ev-sub">
          Pulled from a live scan of your site and your market{dateStr ? <> &nbsp;·&nbsp; {dateStr}</> : null}.
        </div>
      </div>

      {!hasAnything ? (
        <div className="ev-empty">
          We couldn&apos;t complete a live scan of your site this time, so there&apos;s no live evidence to show yet.
          Book a call and we&apos;ll run the full audit with you.
        </div>
      ) : (
        <>
          {/* A.1 — Google profile cards */}
          {hasCards && (
            <div className="ev-cards">
              {rating != null && (
                <div className="ev-card">
                  <div className="big" style={{ color: "var(--emerald)" }}>
                    <span className="ev-star">★</span> {rating.toFixed(1)}
                  </div>
                  <div className="lbl">Google rating</div>
                </div>
              )}
              {reviewCount != null && (
                <div className="ev-card">
                  <div className="big">{reviewCount.toLocaleString()}</div>
                  <div className="lbl">Google reviews</div>
                </div>
              )}
              {gbp != null && (
                <div className="ev-card">
                  <div className="big" style={{ color: gbpTone }}>{gbp}</div>
                  <div className="lbl">Google Business Profile</div>
                </div>
              )}
            </div>
          )}

          {/* A.2 — how the score was built */}
          {pillars.length > 0 && (
            <div className="ev-block">
              <div className="ev-label">How your score was built</div>
              <div className="ev-bar">
                {pillars.map((p) => (
                  <div
                    key={p.label}
                    className="ev-bar-seg"
                    style={{ flexGrow: Math.max(8, p.val), background: tone(p.val).c }}
                  />
                ))}
              </div>
              <div className="ev-legend">
                {pillars.map((p) => (
                  <span className="ev-legend-item" key={p.label}>
                    <i style={{ background: tone(p.val).c }} /> {p.label} <b>{p.val}</b>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* A.3 — who's outranking you */}
          {rivals.length > 0 && (
            <div className="ev-block">
              <div className="ev-label">Who&apos;s outranking you locally</div>
              <div className="ev-ranks">
                {rivals.map((c, i) => (
                  <div className="ev-rank" key={i}>
                    <span className="num">{i + 1}</span>
                    <div className="rank-body">
                      <div className="name">{c.name}</div>
                      {c.term ? <div className="why">{c.term}</div> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* A.4 — what we found */}
          {signals.length > 0 && (
            <div className="ev-block">
              <div className="ev-label">
                What we found &nbsp;·&nbsp; {signals.length} specific {signals.length === 1 ? "signal" : "signals"}
              </div>
              <div className="ev-signals">
                {signals.map((s, i) => (
                  <div className={`ev-signal ${s.sev}`} key={i}>
                    <span className="ic" />
                    <span>{s.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="ev-actions">
        <button className="btn btn-primary" onClick={bookCall}>
          BOOK A STRATEGY CALL
        </button>
        <button className="btn btn-ghost" onClick={makePdf}>
          ⤓ Download PDF report
        </button>
        <button className="btn btn-ghost" onClick={onBack}>
          &larr; Back to results
        </button>
      </div>

      <div className="footnote">A3 Brands · Automotive SEO &amp; Dealer Performance · The numbers don&apos;t lie.</div>
    </section>
  );
}
