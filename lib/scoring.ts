import type { Tier, Tone } from "./types";
import { QUESTIONS } from "./questions";

/** severity → color + label (low reads red, not brand-green) */
export function tone(p: number): Tone {
  if (p < 33) return { c: "#EF4444", bg: "rgba(239,68,68,0.14)", label: "Critical" };
  if (p < 56) return { c: "#F59E0B", bg: "rgba(245,158,11,0.14)", label: "At risk" };
  if (p < 76) return { c: "#34C759", bg: "rgba(52,199,89,0.14)", label: "Solid" };
  return { c: "#1DB954", bg: "rgba(29,185,84,0.16)", label: "Strong" };
}

/** quiz-derived 0-100 score (fallback when live data is unavailable) */
export function computeQuizScore(answers: (number | null)[]): number {
  let total = 0;
  let n = 0;
  QUESTIONS.forEach((Q, i) => {
    if (Q.p !== "SEGMENT" && answers[i] != null) {
      total += (answers[i] as number) + 1;
      n++;
    }
  });
  if (!n) return 0;
  const max = n * 4;
  const min = n * 1;
  return Math.round(((total - min) / (max - min)) * 100);
}

export function getSegment(answers: (number | null)[]): string | null {
  const segQ = QUESTIONS.findIndex((q) => q.p === "SEGMENT");
  const a = answers[segQ];
  return segQ > -1 && a != null ? (QUESTIONS[segQ].seg as string[])[a] : null;
}

export function tierFor(pct: number): Tier {
  if (pct < 33)
    return {
      b: "High Risk · Tier 1",
      t: "You're flying blind, and losing ground.",
      d: "Right now competitors can see more about your market than you can. The good news: this is the highest-upside position to be in. Almost all of it is fixable, and fast.",
    };
  if (pct < 66)
    return {
      b: "Exposed · Tier 2",
      t: "You're partly covered, but leaking visibility.",
      d: "You have instincts and some data, but the picture is incomplete, which is exactly where rivals with less history slip past you. Closing that gap compounds quickly.",
    };
  if (pct < 85)
    return {
      b: "Competitive · Tier 3",
      t: "Strong foundation. A few gaps cost you the top spot.",
      d: "You're ahead of most dealers in your market. The difference between you and #1 is now precision, and that last stretch is what locks in the lead.",
    };
  return {
    b: "Market Leader · Tier 4",
    t: "You're dominating, now defend the position.",
    d: "You know your numbers, your Brand DNA, and your competition. The work now is protecting your moat as AI search reshuffles the rankings. Let's pressure-test it.",
  };
}

/** Space band for the score reveal — how far the rocket travelled toward the moon */
export function bandFor(pct: number): { name: string; blurb: string } {
  if (pct < 33) return { name: "Grounded", blurb: "Still on the launch pad" };
  if (pct < 66) return { name: "Liftoff", blurb: "Engines lit, climbing fast" };
  if (pct < 85) return { name: "In Orbit", blurb: "Up and circling the market" };
  return { name: "Lunar Leader", blurb: "Touched down on the moon" };
}

export const BENCHMARK = Number(process.env.NEXT_PUBLIC_BENCHMARK ?? 58) || 58;
export const CALENDLY_URL =
  process.env.NEXT_PUBLIC_CALENDLY_URL || "https://a3brands.com/book-a-call/";

/**
 * Ranged estimate of monthly buyer searches landing on a competitor, derived from real
 * local search volume and the visibility gap. Returns null when the scan has no volume to
 * stand on (never invent). The bigger the gap below 100, the larger the share that's missed.
 */
export function lostBuyersRange(pct: number, volume: number | null | undefined): { lo: number; hi: number } | null {
  if (!volume || volume < 5) return null;
  const share = Math.min(0.9, Math.max(0.05, (100 - pct) / 100));
  const mid = volume * share;
  if (mid < 2) return null;
  const step = mid >= 40 ? 5 : 1;
  const round = (n: number) => Math.max(step, Math.round(n / step) * step);
  let lo = round(mid * 0.8);
  let hi = round(mid * 1.25);
  if (hi <= lo) hi = lo + step;
  return { lo, hi };
}


/** Abramowitz-Stegun erf approximation */
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}

/** % of dealers this score beats (1-99), modelled as a normal around the benchmark */
export function percentile(score: number, mean = BENCHMARK, sd = 18): number {
  const z = (score - mean) / sd;
  const cdf = 0.5 * (1 + erf(z / Math.SQRT2));
  return Math.max(1, Math.min(99, Math.round(cdf * 100)));
}
