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

/** Firecrawl: render + scrape a URL server-side (gets past bot/WAF 403s). */
async function firecrawlScrape(url: string): Promise<{ html: string; finalUrl: string } | null> {
  const key = process.env.FIRECRAWL_KEY;
  if (!key || !url) return null;
  try {
    const r = await fetchT(
      "https://api.firecrawl.dev/v1/scrape",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ url, formats: ["rawHtml"], onlyMainContent: false, timeout: 15000 }),
        cache: "no-store",
      },
      22000
    );
    if (!r.ok) return null;
    const j: any = await r.json();
    // rawHtml = the full original page (incl. <head> meta we audit); fall back to cleaned html
    const html =
      typeof j?.data?.rawHtml === "string" ? j.data.rawHtml : typeof j?.data?.html === "string" ? j.data.html : "";
    if (!html) return null;
    const finalUrl = typeof j?.data?.metadata?.sourceURL === "string" ? j.data.metadata.sourceURL : url;
    return { html: html.slice(0, 800_000), finalUrl };
  } catch {
    return null;
  }
}

/** Get homepage HTML: Firecrawl first (bypasses 403), else a plain browser-UA fetch. */
async function fetchPageHtml(url: string): Promise<{ html: string; finalUrl: string } | null> {
  const fc = await firecrawlScrape(url);
  if (fc) return fc;
  try {
    const r = await fetchT(
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
    if (!r.ok) return null;
    const html = (await r.text()).slice(0, 800_000);
    return html ? { html, finalUrl: r.url || url } : null;
  } catch {
    return null;
  }
}

/** Score the technical on-page signals from already-fetched HTML. */
function auditHtml(html: string, finalUrl: string): OnPageAudit {
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
    https: 2, title: 2, description: 2, h1: 1, viewport: 2,
    canonical: 1, schema: 2, openGraph: 1, favicon: 1, altText: 1,
  };

  let got = 0;
  let tot = 0;
  for (const k in weights) {
    tot += weights[k];
    if (checks[k]) got += weights[k];
  }
  return { score: Math.round((got / tot) * 100), checks, title, finalUrl };
}

/**
 * Real on-page SEO audit — Firecrawl-rendered HTML when a key is set (bypasses bot
 * blocks), otherwise a plain browser-UA fetch. Scores the technical signals that
 * actually drive dealership visibility.
 */
export async function onPageAudit(url: string): Promise<OnPageAudit | null> {
  if (!url) return null;
  const page = await fetchPageHtml(url);
  return page ? auditHtml(page.html, page.finalUrl) : null;
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

/** www-stripped hostname of a url */
function hostOf(u: string): string {
  try {
    return new URL(u.startsWith("http") ? u : "https://" + u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** turn a SERP result title into a clean dealership name (first segment before |, -, etc.) */
function nameFromTitle(title: string): string {
  return (title || "").split(/[|\-–—:•]/)[0].replace(/\s+/g, " ").trim();
}

/** real Local & reviews score derived from the dealer's own rating + review volume */
function localScoreFrom(rating: number | null, reviews: number | null): number | null {
  if (rating == null) return null;
  const base = (rating / 5) * 70;
  const vol = reviews ? Math.min(30, Math.round((Math.log10(reviews + 1) / Math.log10(2000)) * 30)) : 0;
  return Math.max(0, Math.min(100, Math.round(base + vol)));
}

/** common OEM makes, used to turn a rooftop name into a non-branded local search */
const MAKES = [
  "bmw", "toyota", "honda", "ford", "chevrolet", "chevy", "nissan", "hyundai", "kia", "jeep",
  "ram", "dodge", "chrysler", "gmc", "buick", "cadillac", "lexus", "acura", "audi", "mercedes",
  "mercedes benz", "volkswagen", "vw", "subaru", "mazda", "volvo", "porsche", "jaguar",
  "land rover", "mini", "mitsubishi", "infiniti", "lincoln", "genesis", "tesla", "fiat",
  "alfa romeo", "maserati", "bentley", "rivian", "polestar",
];
function makeFromBrand(brand: string): string {
  const n = ` ${norm(brand)} `;
  for (const m of MAKES) {
    if (n.includes(` ${m} `)) return m === "chevy" ? "chevrolet" : m === "vw" ? "volkswagen" : m;
  }
  return "";
}

/**
 * Firecrawl web search → the real dealership rooftops outranking this dealer for its core
 * NON-branded local terms, plus a search-visibility score from the dealer's own best position.
 */
async function firecrawlSerp(opts: { brand: string; city: string; url: string }): Promise<{
  competitors: { name: string; term: string }[];
  searchScore: number | null;
  found: boolean;
} | null> {
  const key = process.env.FIRECRAWL_KEY;
  if (!key || !opts.brand) return null;
  const ownHost = hostOf(opts.url);
  const ownTokens = new Set(norm(opts.brand).split(" ").filter((t) => t.length >= 3));
  // NON-branded local terms so real competing rooftops surface (a branded search just returns the dealer itself)
  const make = makeFromBrand(opts.brand);
  const city = opts.city || "";
  const terms = make
    ? [`${make} dealer ${city}`.trim(), `best ${make} dealership ${city}`.trim()]
    : [`car dealership ${city}`.trim(), `best car dealer near ${city}`.trim()];

  const search = async (query: string) => {
    try {
      const r = await fetchT(
        "https://api.firecrawl.dev/v1/search",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ query, limit: 8 }),
          cache: "no-store",
        },
        15000
      );
      if (!r.ok) return null;
      const j: any = await r.json();
      return Array.isArray(j?.data) ? j.data : null;
    } catch {
      return null;
    }
  };

  const isOwn = (host: string, title: string) =>
    (!!ownHost && (host === ownHost || host.includes(ownHost) || ownHost.includes(host))) ||
    [...ownTokens].some((t) => norm(title).includes(t) && norm(host).includes(t));

  let bestPos: number | null = null;
  let found = false;
  let gotAny = false;
  const comp: { name: string; term: string }[] = [];
  const seen = new Set<string>();

  for (const term of terms) {
    const results = await search(term);
    if (!results) continue;
    gotAny = true;

    let dealerPos: number | null = null;
    results.forEach((res: any, i: number) => {
      if (dealerPos == null && isOwn(hostOf(res?.url || ""), res?.title || "")) dealerPos = i + 1;
    });
    if (dealerPos != null) { found = true; bestPos = bestPos == null ? dealerPos : Math.min(bestPos, dealerPos); }

    // competitors = dealership results ranking ABOVE the dealer (or all, if the dealer is absent)
    const cutoff = dealerPos ?? results.length;
    for (let i = 0; i < results.length && i < cutoff; i++) {
      const res = results[i];
      const host = hostOf(res?.url || "");
      if (!host || AGGREGATORS.some((a) => host.includes(a))) continue;
      if (ownHost && (host === ownHost || host.includes(ownHost) || ownHost.includes(host))) continue;
      const name = nameFromTitle(res?.title || "");
      if (!name || name.length < 3 || name.length > 70) continue;
      const n = norm(name);
      if (!n || seen.has(n)) continue;
      if ([...ownTokens].some((t) => n.includes(t) && t.length >= 4)) continue;
      seen.add(n);
      comp.push({ name, term: `Ranks above you for "${term}"` });
      if (comp.length >= 3) break;
    }
    if (comp.length >= 3 && found) break;
  }

  if (!gotAny) return null;
  const searchScore = bestPos == null ? 22 : Math.max(20, Math.min(95, 100 - (bestPos - 1) * 11));
  return { competitors: comp.slice(0, 3), searchScore, found };
}

/** Best-effort real Google rating/reviews via a Firecrawl-rendered Google search (null if unsure). */
async function firecrawlRating(opts: { brand: string; city: string }): Promise<{
  rating: number | null;
  review_count: number | null;
  gbp: string | null;
} | null> {
  const key = process.env.FIRECRAWL_KEY;
  if (!key || !opts.brand) return null;
  const q = encodeURIComponent(`${opts.brand} ${opts.city || ""} reviews`.trim());
  const page = await firecrawlScrape(`https://www.google.com/search?q=${q}&hl=en`);
  if (!page) return null;
  const text = page.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  let rating: number | null = null;
  let reviews: number | null = null;
  const m = text.match(/\b([1-5]\.\d)\b\s*(?:★|stars?|out of 5)?\s*[\(·,]?\s*([\d,]{2,})\s*(?:Google\s+)?reviews?/i);
  if (m) {
    rating = parseFloat(m[1]);
    reviews = parseInt(m[2].replace(/,/g, ""), 10);
  }
  if (rating == null) {
    const r2 = text.match(/\b([1-5]\.\d)\b\s*(?:★|stars)/i);
    if (r2) rating = parseFloat(r2[1]);
  }
  if (rating == null && reviews == null) return null;
  return {
    rating: rating != null && rating <= 5 ? rating : null,
    review_count: reviews && reviews > 0 ? reviews : null,
    gbp: rating != null ? "Active" : null,
  };
}

/**
 * Build a real RealData from live sources: on-page audit (Firecrawl/​fetch), real SERP
 * competitors + search-visibility (Firecrawl), Google rating/reviews (Places or Firecrawl),
 * with derived pillar scores. Gemini is optional enrichment only.
 */
export async function realAnalyze(opts: {
  url: string;
  brand: string;
  city: string;
}): Promise<RealData> {
  const [site, serp, places, ai] = await Promise.all([
    onPageAudit(opts.url).catch(() => null),
    firecrawlSerp(opts).catch(() => null),
    placesData(opts).catch(() => null),
    geminiVisibility(opts).catch(() => null),
  ]);

  // rating / reviews / GBP — Places (structured) first, then a Firecrawl Google scrape, then Gemini
  let rr: { rating: number | null; review_count: number | null; gbp: string | null } | null = places
    ? { rating: places.rating, review_count: places.review_count, gbp: places.gbp }
    : null;
  if (!rr || rr.rating == null) {
    const fc = await firecrawlRating(opts).catch(() => null);
    if (fc) {
      rr = {
        rating: fc.rating ?? rr?.rating ?? null,
        review_count: fc.review_count ?? rr?.review_count ?? null,
        gbp: fc.gbp ?? rr?.gbp ?? null,
      };
    }
  }
  const rating = rr?.rating ?? ai?.rating ?? null;
  const review_count = rr?.review_count ?? ai?.review_count ?? null;
  const gbp = rr?.gbp ?? ai?.gbp ?? null;

  // competitors — real SERP outranking first, then Places nearby, then Gemini
  const competitors = serp?.competitors?.length
    ? serp.competitors
    : places?.competitors?.length
    ? places.competitors
    : ai?.competitors ?? [];

  // pillar scores from real signals (Gemini only as a fallback)
  const localScore = localScoreFrom(rating, review_count) ?? ai?.local_score ?? null;
  const aiSearchScore = serp?.searchScore ?? ai?.ai_score ?? null;
  const foundInAI = serp ? serp.found : ai?.foundInAI ?? false;

  const visParts = [aiSearchScore, localScore].filter((v): v is number => v != null);
  const vis = visParts.length
    ? Math.round(visParts.reduce((a, b) => a + b, 0) / visParts.length)
    : ai?.score ?? null;

  const siteHealth = site ? site.score : null;
  let overall: number | null;
  if (siteHealth != null && vis != null) overall = Math.round(0.4 * siteHealth + 0.6 * vis);
  else overall = siteHealth != null ? siteHealth : vis;
  if (overall == null) throw new Error("no live data returned");

  const mergedAi: AiVisibility = {
    score: vis,
    ai_score: aiSearchScore,
    local_score: localScore,
    market_average: ai?.market_average ?? null,
    foundInAI,
    summary: ai?.summary ?? "",
    rating,
    review_count,
    gbp,
    local_search_volume: ai?.local_search_volume ?? null,
    competitors,
    findings: [],
  };

  return {
    overall,
    siteHealth,
    site,
    ai: mergedAi,
    sources: { onpage: !!site, gemini: !!ai },
  };
}
