import "server-only";
import type { AiVisibility, OnPageAudit, RealData } from "./types";

const clampScore = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
};

/** aggregators / directories / marketplaces that are never a "competing rooftop" */
const AGGREGATORS = [
  "cars.com", "autotrader", "cargurus", "truecar", "edmunds", "kelley", "kbb",
  "yelp", "facebook", "carfax", "carvana", "vroom", "carmax", "bing", "google",
  "yellowpages", "mapquest", "dealerrater", "tiktok", "instagram", "youtube",
  "wikipedia", "reddit", "indeed",
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Keep only real competing rooftops: drop aggregators, the dealer's own name/domain, blanks. Max 2. */
function cleanCompetitors(raw: unknown, brand: string, url: string): { name: string; term: string }[] {
  if (!Array.isArray(raw)) return [];
  const ownTokens = new Set(
    [...norm(brand).split(" "), ...norm((url || "").replace(/^https?:\/\/(www\.)?/, "").split("/")[0]).split(" ")]
      .filter((t) => t.length >= 3)
  );
  const out: { name: string; term: string }[] = [];
  const seen = new Set<string>();
  for (const c of raw) {
    const name = typeof c?.name === "string" ? c.name.trim() : "";
    const term = typeof c?.term === "string" ? c.term.trim() : "";
    if (!name || name.length < 3 || name.length > 80) continue;
    const n = norm(name);
    if (!n || seen.has(n)) continue;
    if (AGGREGATORS.some((a) => n.includes(a))) continue;
    // skip the dealer's own rooftop (name overlaps their brand/domain tokens)
    if ([...ownTokens].some((t) => n.includes(t) && t.length >= 4)) continue;
    seen.add(n);
    out.push({ name, term });
    if (out.length >= 2) break;
  }
  return out;
}

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
          // a real browser UA + headers — many dealer sites block non-browser agents
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
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
Also do the following, using real current search results:
- Identify up to TWO specific COMPETING dealership rooftops that are outranking this dealership in the local pack or organic results for its core local buying searches (for example "${opts.brand || "dealer"} near ${opts.city || "me"}", "${opts.brand || "cars"} for sale ${opts.city || ""}"). For each, return its real dealership name and the exact search term it outranks them for.
- Estimate the monthly local search volume for this dealership's core buying terms in this city (a realistic ballpark from search data).
- From its Google Business Profile, return its real star rating (0-5), its real Google review count, and whether the profile looks complete ("Active", "Incomplete", or "Missing"). Use null / 0 / "Missing" if you genuinely can't find it.
Hard rules for competitors:
- Only include real competing dealership rooftops you actually see ranking ABOVE this dealership right now. If you are not confident for a term, leave it out.
- NEVER include aggregators or directories (Cars.com, Autotrader, CarGurus, TrueCar, Edmunds, Kelley Blue Book, KBB, Yelp, Facebook, CarFax, Cargurus, Carvana), this dealership's own website, or the manufacturer's national brand site.
- If you cannot confidently identify any real competing rooftop, return an empty array. Never guess or use a placeholder name.
Return ONLY strict minified JSON, no markdown:
{"score":<int 0-100 overall visibility>,"ai_score":<int 0-100 presence in AI/search recommendations>,"local_score":<int 0-100 reviews/local presence>,"market_average":<int 0-100 typical visibility of competing dealers in this market>,"foundInAI":<true|false>,"summary":"<one concise sentence a dealer principal would understand>","local_search_volume":<int monthly searches, 0 if unknown>,"rating":<number 0-5 google rating or null>,"review_count":<int google reviews or null>,"gbp":"<Active|Incomplete|Missing>","competitors":[{"name":"<real competing dealership rooftop>","term":"<short reason it outranks you, e.g. 'Owns the AI Overview' or 'Ranks #1 for BMW dealer Atlanta' or 'Cited in ChatGPT answers'>"}]}`;

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
  const vol = Number(o.local_search_volume);
  return {
    score: clampScore(o.score),
    ai_score: clampScore(o.ai_score),
    local_score: clampScore(o.local_score),
    market_average: clampScore(o.market_average),
    foundInAI: !!o.foundInAI,
    summary: typeof o.summary === "string" ? o.summary : "",
    rating: Number.isFinite(Number(o.rating)) && Number(o.rating) > 0 ? Math.min(5, Math.round(Number(o.rating) * 10) / 10) : null,
    review_count: Number.isFinite(Number(o.review_count)) && Number(o.review_count) > 0 ? Math.round(Number(o.review_count)) : null,
    gbp: typeof o.gbp === "string" && /^(Active|Incomplete|Missing)$/i.test(o.gbp.trim()) ? o.gbp.trim() : null,
    local_search_volume: Number.isFinite(vol) && vol > 0 ? Math.round(vol) : null,
    competitors: cleanCompetitors(o.competitors, opts.brand, opts.url),
    findings: [],
  };
}

/**
 * Real Google Places (New) data — the dealer's own rating/reviews/GBP status and the real
 * competing dealership rooftops nearby. Reuses PAGESPEED_KEY's Google Cloud project; returns
 * null until "Places API (New)" is enabled (+ billing) on that project.
 */
export async function placesData(opts: { brand: string; city: string }): Promise<{
  rating: number | null;
  review_count: number | null;
  gbp: string | null;
  competitors: { name: string; term: string }[];
} | null> {
  const key = process.env.PAGESPEED_KEY;
  if (!key || !opts.brand) return null;

  const searchText = async (textQuery: string, fieldMask: string, extra: Record<string, unknown> = {}) => {
    try {
      const r = await fetchT(
        "https://places.googleapis.com/v1/places:searchText",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": fieldMask },
          body: JSON.stringify({ textQuery, ...extra }),
          cache: "no-store",
        },
        8000
      );
      if (!r.ok) return null;
      return (await r.json()) as any;
    } catch {
      return null;
    }
  };

  // 1) the dealer's own Google Business Profile
  const dj = await searchText(
    `${opts.brand}${opts.city ? " " + opts.city : ""}`,
    "places.displayName,places.rating,places.userRatingCount,places.businessStatus,places.location"
  );
  const me = dj?.places?.[0];
  if (!me) return null;
  const rating = typeof me.rating === "number" ? Math.round(me.rating * 10) / 10 : null;
  const review_count = typeof me.userRatingCount === "number" ? me.userRatingCount : null;
  const gbp = me.businessStatus === "OPERATIONAL" ? "Active" : me.businessStatus ? "Incomplete" : null;

  // 2) real competing dealership rooftops in the same market
  const myName = norm(me.displayName?.text || opts.brand);
  const extra: Record<string, unknown> = { maxResultCount: 10, includedType: "car_dealer" };
  if (me.location?.latitude) {
    extra.locationBias = { circle: { center: { latitude: me.location.latitude, longitude: me.location.longitude }, radius: 30000 } };
  }
  const cj = await searchText(
    `car dealer${opts.city ? " near " + opts.city : ""}`,
    "places.displayName,places.rating,places.userRatingCount",
    extra
  );
  const competitors: { name: string; term: string }[] = [];
  for (const p of cj?.places || []) {
    const name = typeof p?.displayName?.text === "string" ? p.displayName.text.trim() : "";
    if (!name) continue;
    const n = norm(name);
    if (n === myName || n.includes(myName) || myName.includes(n)) continue;
    if (AGGREGATORS.some((a) => n.includes(a))) continue;
    if (competitors.some((c) => norm(c.name) === n)) continue;
    const rc = typeof p.userRatingCount === "number" ? p.userRatingCount : 0;
    const rt = typeof p.rating === "number" ? p.rating : null;
    const term = rt ? `${rt.toFixed(1)}★ · ${rc.toLocaleString()} Google reviews` : `${rc.toLocaleString()} Google reviews`;
    competitors.push({ name, term });
    if (competitors.length >= 3) break;
  }
  return { rating, review_count, gbp, competitors };
}

/** Blend on-page health (40%) + AI/search visibility (60%) into a real overall score. */
export async function realAnalyze(opts: {
  url: string;
  brand: string;
  city: string;
}): Promise<RealData> {
  const [site, ai, places] = await Promise.all([
    onPageAudit(opts.url).catch(() => null),
    geminiVisibility(opts).catch(() => null),
    placesData(opts).catch(() => null),
  ]);

  // merge in real Google Places data (rating/reviews/GBP + competitors) where available;
  // Places is the more reliable source, so it takes precedence over the Gemini estimates.
  let mergedAi = ai;
  if (places) {
    const base: AiVisibility =
      ai ?? {
        score: null, ai_score: null, local_score: null, market_average: null,
        foundInAI: false, summary: "", rating: null, review_count: null, gbp: null,
        local_search_volume: null, competitors: [], findings: [],
      };
    mergedAi = {
      ...base,
      rating: places.rating ?? base.rating,
      review_count: places.review_count ?? base.review_count,
      gbp: places.gbp ?? base.gbp,
      competitors: places.competitors.length ? places.competitors : base.competitors,
    };
  }

  const siteHealth = site ? site.score : null;
  const vis = mergedAi && mergedAi.score != null ? mergedAi.score : null;

  let overall: number | null;
  if (siteHealth != null && vis != null) overall = Math.round(0.4 * siteHealth + 0.6 * vis);
  else overall = siteHealth != null ? siteHealth : vis;

  if (overall == null) throw new Error("no live data returned");

  return {
    overall,
    siteHealth,
    site,
    ai: mergedAi,
    sources: { onpage: !!site, gemini: !!ai },
  };
}
