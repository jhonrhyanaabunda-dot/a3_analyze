import "server-only";
import type { AiVisibility, OnPageAudit, RealData } from "./types";

const clampScore = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
};

export function normalizeUrl(u: string): string {
  u = (u || "").trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u;
}

/** fetch with a hard timeout so one slow source can't blow the budget */
async function fetchT(url: string, opts: RequestInit, ms: number): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: c.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fast, real on-page SEO audit: fetch the homepage HTML and score the technical
 * signals that actually drive dealership visibility. ~1-3s vs ~60-90s for a
 * full PageSpeed/Lighthouse run.
 */
export async function onPageAudit(url: string): Promise<OnPageAudit | null> {
  if (!url) return null;
  let r: Response;
  try {
    r = await fetchT(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; A3VisibilityBot/1.0; +https://a3brands.com)",
          Accept: "text/html",
        },
        redirect: "follow",
        cache: "no-store",
      },
      9000
    );
  } catch {
    return null;
  }
  if (!r.ok) return null;
  const finalUrl = r.url || url;

  let html = "";
  try {
    html = (await r.text()).slice(0, 800_000);
  } catch {
    return null;
  }

  const has = (re: RegExp) => re.test(html);
  const grab = (re: RegExp) => {
    const m = html.match(re);
    return m ? m[1] : "";
  };

  const title = grab(/<title[^>]*>([\s\S]*?)<\/title>/i).replace(/\s+/g, " ").trim();
  const desc =
    grab(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    grab(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  const h1count = (html.match(/<h1[\s>]/gi) || []).length;
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const imgsWithAlt = imgs.filter((t) => /\balt\s*=/i.test(t)).length;
  const altOk = imgs.length === 0 || imgsWithAlt / imgs.length >= 0.6;

  const checks: Record<string, boolean> = {
    https: /^https:/i.test(finalUrl),
    title: title.length >= 10 && title.length <= 70,
    description: !!desc && desc.length >= 50 && desc.length <= 170,
    h1: h1count >= 1,
    viewport: has(/<meta[^>]+name=["']viewport["']/i),
    canonical: has(/<link[^>]+rel=["']canonical["']/i),
    schema: has(/application\/ld\+json/i),
    openGraph: has(/property=["']og:/i),
    favicon: has(/rel=["'][^"']*icon/i),
    altText: altOk,
  };

  const weights: Record<string, number> = {
    https: 2,
    title: 2,
    description: 2,
    h1: 1,
    viewport: 2,
    canonical: 1,
    schema: 2,
    openGraph: 1,
    favicon: 1,
    altText: 1,
  };

  let got = 0;
  let tot = 0;
  for (const k in weights) {
    tot += weights[k];
    if (checks[k]) got += weights[k];
  }
  const score = Math.round((got / tot) * 100);

  return { score, checks, title, finalUrl };
}

/** Gemini 2.5-flash (grounded with Google Search) -> real AI/search visibility. */
export async function geminiVisibility(opts: {
  brand: string;
  city: string;
  url: string;
}): Promise<AiVisibility | null> {
  const key = process.env.GEMINI_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    model +
    ":generateContent?key=" +
    encodeURIComponent(key);

  const prompt = `You are auditing the live online visibility of a car dealership for a marketing report. Use web search.
Dealership: ${opts.brand || "(unknown)"}
City / market: ${opts.city || "(unknown)"}
Website: ${opts.url || "(unknown)"}
Assess, based on what you actually find online right now:
- whether this dealership shows up and is recommended when local shoppers search (and when they ask AI) for the best place to buy
- the strength of its Google Business Profile, ratings and reviews
- its overall local brand presence
- the typical online visibility of the COMPETING dealers in this same city/market (the market average to benchmark against)
Return ONLY strict minified JSON, no markdown:
{"score":<int 0-100 overall visibility>,"ai_score":<int 0-100 presence in AI/search recommendations>,"local_score":<int 0-100 reviews/local presence>,"market_average":<int 0-100 typical visibility of competing dealers in this market>,"foundInAI":<true|false>,"summary":"<one concise sentence a dealer principal would understand>"}`;

  const call = (useTools: boolean, ms: number) => {
    const body: any = {
      contents: [{ parts: [{ text: prompt }], role: "user" }],
      generationConfig: { temperature: 0.2 },
    };
    if (useTools) body.tools = [{ google_search: {} }];
    return fetchT(
      endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      },
      ms
    );
  };

  // Try grounded (real web search) first; if it times out or errors, fall back to a fast ungrounded pass.
  let r: Response | null = null;
  try {
    const g = await call(true, 16000);
    if (g.ok) r = g;
  } catch {
    /* grounded timed out — fall through */
  }
  if (!r) {
    try {
      const u = await call(false, 7000);
      if (u.ok) r = u;
    } catch {
      /* ignore */
    }
  }
  if (!r) return null;
  const j: any = await r.json();
  let txt = "";
  try {
    txt = j.candidates[0].content.parts.map((p: any) => p.text || "").join("");
  } catch {
    /* ignore */
  }
  const m = txt.match(/\{[\s\S]*\}/);
  let o: any = {};
  if (m) {
    try {
      o = JSON.parse(m[0]);
    } catch {
      /* ignore */
    }
  }
  return {
    score: clampScore(o.score),
    ai_score: clampScore(o.ai_score),
    local_score: clampScore(o.local_score),
    market_average: clampScore(o.market_average),
    foundInAI: !!o.foundInAI,
    summary: typeof o.summary === "string" ? o.summary : "",
  };
}

/** Blend on-page health (40%) + AI/search visibility (60%) into a real overall score. */
export async function realAnalyze(opts: {
  url: string;
  brand: string;
  city: string;
}): Promise<RealData> {
  const [site, ai] = await Promise.all([
    onPageAudit(opts.url).catch(() => null),
    geminiVisibility(opts).catch(() => null),
  ]);

  const siteHealth = site ? site.score : null;
  const vis = ai && ai.score != null ? ai.score : null;

  let overall: number | null;
  if (siteHealth != null && vis != null) overall = Math.round(0.4 * siteHealth + 0.6 * vis);
  else overall = siteHealth != null ? siteHealth : vis;

  if (overall == null) throw new Error("no live data returned");

  return {
    overall,
    siteHealth,
    site,
    ai,
    sources: { onpage: !!site, gemini: !!ai },
  };
}
