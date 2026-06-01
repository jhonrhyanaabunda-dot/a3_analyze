# A3 Brands — Dealer Visibility Analyzer (Next.js)

A real-data visibility audit for car dealerships. A 12-question diagnostic captures intent and
segment, then a live analysis scores the dealership's actual online visibility using **Google
PageSpeed Insights** (site health) and **Gemini with Google Search grounding** (AI/search
visibility). The score, benchmark, and findings render in a branded report with the Saggy mascot.

## Why Next.js

The original was a single `index.html` with the API keys exposed in the browser. This version moves
both keys **server-side** into API routes, so they're never shipped to the client.

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **React 18**
- Server API routes for the real data: `app/api/analyze` and `app/api/lead`
- No CSS framework — the A3 design system lives in `app/globals.css`

## Getting started

```bash
# 1. Install Node 18+ (https://nodejs.org) if you don't have it
node -v

# 2. Install dependencies
npm install

# 3. Configure keys
cp .env.example .env.local   # then edit .env.local
# (a .env.local with your keys is already present)

# 4. Run
npm run dev        # http://localhost:3000
```

## Environment variables (`.env.local`)

| Var | Where | Purpose |
|---|---|---|
| `PAGESPEED_KEY` | server only | Google API key with **PageSpeed Insights API** enabled |
| `GEMINI_KEY` | server only | Gemini API key from https://aistudio.google.com/app/apikey (starts with `AIza`) |
| `GEMINI_MODEL` | server only | default `gemini-2.0-flash` (grounded with Google Search) |
| `LEAD_WEBHOOK_URL` | server only | optional CRM/Zapier/Make catch-hook for captured leads |
| `NEXT_PUBLIC_BENCHMARK` | public | market-average score shown on the benchmark bar (default 58) |
| `NEXT_PUBLIC_CALENDLY_URL` | public | strategy-call booking link |

> **Note on the provided Gemini key:** the key currently in `.env.local` (`AQ.…`) authenticates but
> returns `429 limit:0` — its project has no free-tier quota. Create a standard `AIza…` key at
> https://aistudio.google.com/app/apikey and replace `GEMINI_KEY`. PageSpeed works as-is.

## How the score is computed

`lib/realData.ts` → `realAnalyze()`:

1. **PageSpeed** (mobile): performance, SEO, best-practices, accessibility → averaged into `siteHealth`.
2. **Gemini** (grounded): returns `score`, `ai_score`, `local_score`, `foundInAI`, `summary`.
3. **Overall = 40% siteHealth + 60% AI visibility.**

If a source fails, the app degrades gracefully — and if neither key is set, the client falls back to
the quiz-derived score (`lib/scoring.ts → computeQuizScore`).

## Project structure

```
app/
  layout.tsx            # html shell + Sora font
  page.tsx              # client orchestrator (stage state machine)
  globals.css           # A3 design system
  api/analyze/route.ts  # server: PageSpeed + Gemini  (keys never reach the browser)
  api/lead/route.ts     # server: lead capture + optional webhook
components/              # Intro, Quiz, Capture, Analyzing, Results, Mascot, CountUp
lib/                     # types, questions, scoring, realData (server-only)
public/                  # saggy_mascot.webm / saggy_alpha.mov / saggy_mascot.mp4
```

## Deploy

Push to GitHub and import into **Vercel**. Add the same env vars in the Vercel dashboard
(Project → Settings → Environment Variables). The API routes run as serverless functions, keeping
the keys private.

## Security checklist before launch

- Restrict `PAGESPEED_KEY` by API + (for any client use) HTTP referrer in Google Cloud Console.
- Keep `GEMINI_KEY` server-only (it already is here — never expose it client-side).
- Rotate any key that has been shared in plaintext.
