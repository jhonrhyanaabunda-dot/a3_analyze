import type { Lead, RealData } from "./types";

type RGB = [number, number, number];

// palette
const DARK: RGB = [11, 13, 15];
const INK: RGB = [22, 26, 31];
const BODY: RGB = [74, 81, 92];
const MUTED: RGB = [138, 145, 156];
const HAIR: RGB = [228, 231, 237];
const CARD: RGB = [246, 248, 250];
const WHITE: RGB = [255, 255, 255];
const GREEN: RGB = [29, 185, 84];
const DEEPGREEN: RGB = [9, 66, 36]; // legible secondary text on the green band/CTA
const AMBER: RGB = [240, 158, 30];
const RED: RGB = [235, 72, 72];

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// value -> traffic-light color (mirrors the on-screen tone bands)
function toneColor(v: number): RGB {
  if (v >= 70) return GREEN;
  if (v >= 45) return AMBER;
  return RED;
}

type Sig = { sev: "bad" | "warn" | "good"; text: string };

export async function downloadReportPdf(opts: {
  score: number;
  color: string;
  tierLabel: string;
  tierTitle: string;
  summary: string;
  percentileSentence: string;
  benchmark: number;
  lead: Lead | null;
  real: RealData | null;
  calendly: string;
}): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 46;
  const CW = W - 2 * M; // content width
  const scoreColor = hexToRgb(opts.color);

  const dealerName = opts.lead?.dealership || "Your dealership";
  const cityName = opts.lead?.city || "your market";
  const dateStr = (() => {
    try {
      return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch {
      return "";
    }
  })();

  const ai = opts.real?.ai ?? null;
  const competitors = (ai?.competitors ?? []).filter((c) => c && c.name).slice(0, 3);
  const primaryRival = competitors[0] || null;
  const found = !!ai?.foundInAI;

  // ---- small drawing helpers --------------------------------------------
  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const stroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);

  let y = 0;

  const footer = () => {
    ink(MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("A3 Brands  ·  Automotive SEO & Dealer Performance", M, H - 26);
    doc.text("The numbers don't lie.", W - M, H - 26, { align: "right" });
  };

  const contHeader = () => {
    fill(GREEN);
    doc.rect(0, 0, W, 40, "F");
    fill(WHITE);
    doc.roundedRect(M, 12, 17, 17, 4, 4, "F");
    ink(GREEN);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("A3", M + 8.5, 24, { align: "center" });
    ink(WHITE);
    doc.setFontSize(10);
    doc.text("A3 BRANDS", M + 26, 24.5);
    ink(DEEPGREEN);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`${dealerName.toUpperCase()}  ·  VISIBILITY REPORT`, W - M, 24.5, { align: "right" });
  };

  const newPage = () => {
    footer();
    doc.addPage();
    fill(WHITE);
    doc.rect(0, 0, W, H, "F");
    contHeader();
    y = 66;
  };

  // reserve room before footer; flow onto a new page when a block won't fit
  const ensure = (need: number) => {
    if (y + need > H - 58) newPage();
  };

  const sectionLabel = (label: string) => {
    ensure(40);
    ink(MUTED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(label.toUpperCase(), M, y);
    y += 16;
  };

  // ---- page background --------------------------------------------------
  fill(WHITE);
  doc.rect(0, 0, W, H, "F");

  // ---- header band ------------------------------------------------------
  const bandH = 122;
  fill(GREEN);
  doc.rect(0, 0, W, bandH, "F");
  // logo — white tile with green monogram, so it reads on the green band
  fill(WHITE);
  doc.roundedRect(M, 30, 28, 28, 7, 7, "F");
  ink(GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("A3", M + 14, 48.5, { align: "center" });
  ink(WHITE);
  doc.setFontSize(14);
  doc.text("A3 BRANDS", M + 38, 49);
  ink(DEEPGREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("DEALER VISIBILITY REPORT", W - M, 48, { align: "right" });
  // dealership + meta
  ink(WHITE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(dealerName, M, 92);
  ink(DEEPGREEN);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text([opts.lead?.website, opts.lead?.city, dateStr].filter(Boolean).join("   ·   "), M, 110);

  y = bandH + 24;

  // ---- hero: the cost of the gap (search-accurate, no AI overclaim) -----
  ink(GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("THE COST OF YOUR VISIBILITY GAP", M, y);
  y += 19;

  const heroLine = opts.real
    ? primaryRival
      ? `When shoppers search for the best dealer in ${cityName}, ${primaryRival.name} shows up before you, not ${dealerName}. Those are buyers who never reach your lot.`
      : !found
      ? `When shoppers search for the best dealer in ${cityName}, your store isn't at the top. Those leads are landing with competitors instead of in your CRM.`
      : `You're showing up in ${cityName} search, but the gaps below are still routing ready-to-buy shoppers to other dealers.`
    : `Your visibility score shows how easily buyers find you when they go looking. Below the benchmark means competitors are getting found first.`;

  ink(INK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  const heroWrapped = doc.splitTextToSize(heroLine, CW);
  doc.text(heroWrapped, M, y, { lineHeightFactor: 1.38 });
  y += heroWrapped.length * 18 + 14;

  // ---- score card -------------------------------------------------------
  const cardH = 92;
  fill(CARD);
  doc.roundedRect(M, y, CW, cardH, 14, 14, "F");
  // big score
  ink(scoreColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(56);
  doc.text(String(opts.score), M + 24, y + 60);
  const numW = doc.getTextWidth(String(opts.score));
  ink(MUTED);
  doc.setFontSize(14);
  doc.text("/100", M + 24 + numW + 7, y + 60);
  ink(MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("VISIBILITY SCORE", M + 26, y + 80);
  // tier pill + title (right column)
  const colX = M + 196;
  doc.setFontSize(8.5);
  const pillW = doc.getTextWidth(opts.tierLabel.toUpperCase()) + 22;
  fill(scoreColor);
  doc.roundedRect(colX, y + 22, pillW, 20, 10, 10, "F");
  ink(WHITE);
  doc.setFont("helvetica", "bold");
  doc.text(opts.tierLabel.toUpperCase(), colX + 11, y + 35.5);
  ink(INK);
  doc.setFontSize(13);
  const titleWrapped = doc.splitTextToSize(opts.tierTitle, W - M - colX).slice(0, 2);
  doc.text(titleWrapped, colX, y + 60, { lineHeightFactor: 1.25 });

  y += cardH + 18;

  // ---- benchmark bar ----------------------------------------------------
  const barH = 9;
  const benchPct = Math.max(0, Math.min(100, opts.benchmark)) / 100;
  const scorePct = Math.max(0, Math.min(100, opts.score)) / 100;
  fill(HAIR);
  doc.roundedRect(M, y, CW, barH, barH / 2, barH / 2, "F");
  fill(scoreColor);
  doc.roundedRect(M, y, Math.max(barH, CW * scorePct), barH, barH / 2, barH / 2, "F");
  // benchmark tick
  const tickX = M + CW * benchPct;
  stroke(INK);
  doc.setLineWidth(2);
  doc.line(tickX, y - 4, tickX, y + barH + 4);
  doc.setLineWidth(0.5);
  y += barH + 16;
  ink(scoreColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`You  ${opts.score}/100`, M, y);
  ink(MUTED);
  doc.setFont("helvetica", "normal");
  doc.text(`Market average  ${opts.benchmark}`, W - M, y, { align: "right" });
  y += 16;

  // ---- summary (only when we actually have one) -------------------------
  if (opts.summary) {
    sectionLabel("What this means");
    ink(BODY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    const sumWrapped = doc.splitTextToSize(opts.summary, CW);
    ensure(sumWrapped.length * 15 + 8);
    doc.text(sumWrapped, M, y, { lineHeightFactor: 1.4 });
    y += sumWrapped.length * 15 + 18;
  }

  // ---- pillars: how the score was built ---------------------------------
  const pillars = [
    { label: "On-page SEO", val: opts.real?.siteHealth ?? null },
    { label: "AI & search visibility", val: ai?.ai_score ?? null },
    { label: "Local & reviews", val: ai?.local_score ?? null },
  ].filter((p) => p.val != null) as { label: string; val: number }[];

  if (pillars.length > 0) {
    sectionLabel("How your score was built");
    pillars.forEach((p) => {
      ensure(32);
      const pc = toneColor(p.val);
      ink(INK);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.text(p.label, M, y);
      ink(pc);
      doc.setFont("helvetica", "bold");
      doc.text(String(p.val), W - M, y, { align: "right" });
      y += 8;
      fill(HAIR);
      doc.roundedRect(M, y, CW, 6, 3, 3, "F");
      fill(pc);
      doc.roundedRect(M, y, Math.max(6, CW * (p.val / 100)), 6, 3, 3, "F");
      y += 19;
    });
    y += 2;
    ink(MUTED);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.text("On-page SEO is measured live; AI & search and local are estimated from your live signals.", M, y);
    doc.setFont("helvetica", "normal");
    y += 15;
  }

  // ---- who's outranking you ---------------------------------------------
  if (competitors.length > 0) {
    sectionLabel("Who's outranking you in search");
    competitors.forEach((c, i) => {
      const hasTerm = !!c.term;
      ensure(hasTerm ? 40 : 30);
      // rank badge
      fill(scoreColor);
      doc.circle(M + 11, y - 4, 11, "F");
      ink(WHITE);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(String(i + 1), M + 11, y, { align: "center" });
      // name + term
      ink(INK);
      doc.setFontSize(11.5);
      doc.text(c.name, M + 34, y - 3);
      if (hasTerm) {
        ink(MUTED);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.text(c.term as string, M + 34, y + 11);
      }
      y += hasTerm ? 31 : 25;
    });
    y += 2;
  }

  // ---- what we found (signals from real checks + search presence) -------
  const signals: Sig[] = (() => {
    const out: Sig[] = [];
    const c = opts.real?.site?.checks;
    if (c) {
      out.push(
        c.schema
          ? { sev: "good", text: "Structured data found, so Google can read your inventory." }
          : { sev: "bad", text: "No structured data (schema) on your homepage, so search engines can't read your inventory." }
      );
      if (!c.https) out.push({ sev: "bad", text: "Your site isn't fully secure (no HTTPS), which costs you ranking and trust." });
      if (!c.viewport) out.push({ sev: "bad", text: "Your homepage isn't mobile-ready, where most car shoppers start." });
      if (!c.description) out.push({ sev: "warn", text: "Your homepage is missing a search description, so your listing shows weaker copy." });
      if (!c.title) out.push({ sev: "warn", text: "Your homepage title tag is weak, which Google leans on to rank you." });
      if (c.https && c.viewport && c.title)
        out.push({ sev: "good", text: "Your site is secure, mobile-ready, and titled, the technical basics are in place." });
    }
    if (ai) {
      out.push(
        ai.foundInAI
          ? { sev: "good", text: "You show up in Google search for the best dealer in your market." }
          : { sev: "warn", text: "You're not showing up in Google search for the best dealer in your market." }
      );
    }
    const order = { bad: 0, warn: 1, good: 2 } as const;
    return out.sort((a, b) => order[a.sev] - order[b.sev]).slice(0, 5);
  })();

  if (signals.length > 0) {
    sectionLabel(`What we found  ·  ${signals.length} ${signals.length === 1 ? "signal" : "signals"}`);
    signals.forEach((s) => {
      const sc = s.sev === "good" ? GREEN : s.sev === "warn" ? AMBER : RED;
      ink(BODY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      const wrapped = doc.splitTextToSize(s.text, CW - 22);
      ensure(wrapped.length * 14 + 8);
      fill(sc);
      doc.circle(M + 4, y - 3, 3.4, "F");
      doc.text(wrapped, M + 22, y, { lineHeightFactor: 1.35 });
      y += wrapped.length * 14 + 7;
    });
    y += 4;
  }

  // ---- CTA --------------------------------------------------------------
  ensure(66);
  fill(GREEN);
  doc.roundedRect(M, y, CW, 52, 12, 12, "F");
  ink([12, 40, 22]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Book your strategy call", M + 22, y + 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("See the full audit and a plan to win these buyers back.", M + 22, y + 41);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Call (302) 394-6940", W - M - 22, y + 32, { align: "right" });

  footer();

  const slug = (opts.lead?.dealership || "dealership").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`A3-Visibility-Report-${slug}.pdf`);
}
