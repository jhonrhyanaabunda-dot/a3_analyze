import type { Lead, RealData } from "./types";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

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
  const M = 48;
  const [cr, cg, cb] = hexToRgb(opts.color);

  // background
  doc.setFillColor(11, 13, 15);
  doc.rect(0, 0, W, H, "F");

  // header
  doc.setFillColor(29, 185, 84);
  doc.roundedRect(M, M, 30, 30, 7, 7, "F");
  doc.setTextColor(44, 48, 56);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("A3", M + 15, M + 20, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text("A3 BRANDS", M + 42, M + 20);
  doc.setTextColor(138, 145, 156);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DEALER VISIBILITY REPORT", W - M, M + 19, { align: "right" });

  // dealership + date
  let y = M + 78;
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(opts.lead?.dealership || "Your dealership", M, y);
  y += 20;
  doc.setTextColor(138, 145, 156);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const dateStr = (() => {
    try {
      return new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } catch {
      return "";
    }
  })();
  doc.text(
    [opts.lead?.website, opts.lead?.city, dateStr].filter(Boolean).join("   ·   "),
    M,
    y
  );

  // big score
  y += 70;
  doc.setTextColor(cr, cg, cb);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(86);
  doc.text(String(opts.score), M, y);
  doc.setFontSize(16);
  doc.text("/100", M + doc.getTextWidth(String(opts.score)) + 8, y);
  doc.setTextColor(138, 145, 156);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("VISIBILITY SCORE", M + 2, y + 16);

  // tier badge + title (right of score)
  const tx = M + 200;
  doc.setFillColor(cr, cg, cb);
  doc.roundedRect(tx, y - 56, doc.getTextWidth(opts.tierLabel) + 22, 22, 11, 11, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(opts.tierLabel.toUpperCase(), tx + 11, y - 42);
  doc.setTextColor(230, 234, 240);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(doc.splitTextToSize(opts.tierTitle, W - tx - M), tx, y - 16);
  doc.setTextColor(160, 167, 178);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(opts.percentileSentence, tx, y + 12);

  // divider
  y += 50;
  doc.setDrawColor(40, 44, 52);
  doc.line(M, y, W - M, y);

  // benchmark + summary
  y += 26;
  doc.setTextColor(138, 145, 156);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("BENCHMARK", M, y);
  doc.setTextColor(230, 234, 240);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  y += 18;
  doc.text(`Market average ${opts.benchmark}   ·   You ${opts.score}`, M, y);

  if (opts.summary) {
    y += 30;
    doc.setTextColor(138, 145, 156);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("WHAT WE FOUND", M, y);
    y += 18;
    doc.setTextColor(214, 218, 224);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(doc.splitTextToSize(opts.summary, W - 2 * M), M, y, { lineHeightFactor: 1.4 });
    y += doc.splitTextToSize(opts.summary, W - 2 * M).length * 15;
  }

  // live metrics
  if (opts.real?.ai) {
    y += 22;
    const ai = opts.real.ai;
    const rows: [string, string][] = [];
    if (opts.real.siteHealth != null) rows.push(["On-page SEO health", `${opts.real.siteHealth}/100`]);
    if (ai.ai_score != null) rows.push(["Visibility in AI & search", `${ai.ai_score}/100`]);
    if (ai.local_score != null) rows.push(["Local & reviews presence", `${ai.local_score}/100`]);
    rows.push(["Cited when shoppers ask AI", ai.foundInAI ? "Yes" : "No"]);
    rows.forEach(([k, v]) => {
      doc.setTextColor(160, 167, 178);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(k, M, y);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(v, W - M, y, { align: "right" });
      y += 20;
    });
  }

  // footer CTA
  doc.setFillColor(29, 185, 84);
  doc.roundedRect(M, H - 96, W - 2 * M, 48, 12, 12, "F");
  doc.setTextColor(44, 48, 56);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Book your strategy call", M + 20, H - 66);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(opts.calendly, W - M - 20, H - 66, { align: "right" });

  doc.setTextColor(110, 116, 126);
  doc.setFontSize(8);
  doc.text("A3 Brands · Automotive SEO & Dealer Performance", M, H - 32);

  const slug = (opts.lead?.dealership || "dealership").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`A3-Visibility-Report-${slug}.pdf`);
}
