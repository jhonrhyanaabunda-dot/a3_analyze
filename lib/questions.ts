import type { Pillar, Question } from "./types";

/**
 * Each option scores 1 (worst, in denial) -> 4 (best, aware and ready to act).
 * All questions are scored. Pillars: SEARCH (rank/AI/OEM), DATA (leads/cost/measurement),
 * LOCAL (reviews/site/Brand DNA) — used for the weakest-pillar nudge.
 */
export const QUESTIONS: Question[] = [
  {
    p: "SEARCH",
    q: "Do you know how many local buyers choose a higher-ranked dealer?",
    a: [
      "None that I know of, I figure I get my share",
      "Probably some, but I've never put a number on it",
      "Enough that it bugs me, I just can't prove how many",
      "No idea, and that blind spot could be costing me real deals",
    ],
  },
  {
    p: "DATA",
    q: "Do you know which sources your leads come from?",
    a: [
      "I assume the usual places",
      "I have a rough idea",
      "Not really, the sources blur together",
      "No, and that blind spot worries me",
    ],
  },
  {
    p: "SEARCH",
    q: "Do you know whether AI tools recommend your store to shoppers?",
    a: [
      "Zero, my buyers don't use AI",
      "Maybe a handful, but it can't be many",
      "It could be happening and I'd never see it",
      "No, and losing sales I can't even track scares me",
    ],
  },
  {
    p: "DATA",
    q: "Are your leads down compared to last year?",
    a: [
      "No, we're steady or up",
      "Maybe a little, hard to say",
      "Yes, and I'm not sure why",
      "Yes, and it's a real concern",
    ],
  },
  {
    p: "DATA",
    q: "Can your agency prove it drives real sales?",
    a: [
      "I assume it's working",
      "They show activity, not real sales",
      "I've paid with little to show for it",
      "No, I've never seen real proof",
    ],
  },
  {
    p: "DATA",
    q: "Do you know your true cost per lead?",
    a: [
      "Doesn't matter to me, the deals still close",
      "I know roughly, close enough",
      "I've overpaid for leads and felt it on margin",
      "No, and that means profit is leaking on every deal",
    ],
  },
  {
    p: "SEARCH",
    q: "If you paused ads, would the leads keep coming?",
    a: [
      "Yes, my organic leads are strong",
      "Some would stay, some would drop",
      "I've felt the drop the moment ads paused",
      "No, they'd mostly dry up without ads",
    ],
  },
  {
    p: "LOCAL",
    q: "Do you know how long shoppers stay on your site?",
    a: [
      "I assume long enough",
      "Roughly, I'd guess it's okay",
      "I know they leave fast, not why",
      "No idea, and that could be lost leads",
    ],
  },
  {
    p: "LOCAL",
    q: "How do your reviews compare to nearby dealers?",
    a: [
      "Winning, my reviews are fine",
      "They're okay, probably not costing me much",
      "I've likely lost buyers to better-looking competitors",
      "Losing them, and those are calls I'll never even get",
    ],
  },
  {
    p: "SEARCH",
    q: "Do you know what Google and AI see when they rank your store?",
    a: [
      "I get found fine, no sales lost there",
      "Maybe a few slip through the cracks",
      "If they don't trust me, I'd never know the deals I missed",
      "No idea what they see, and that could be costing me buyers daily",
    ],
  },
  {
    p: "LOCAL",
    q: "If ownership saw these numbers, would they push for change?",
    a: [
      "They're happy with where we are",
      "Maybe, if the gap was clear",
      "They'd want a plan, and fast",
      "Yes, and I'd lead that change",
    ],
  },
];

export const PILLAR_META: Record<Exclude<Pillar, "SEGMENT">, { label: string; desc: string }> = {
  SEARCH: { label: "Search & AI Rank", desc: "Organic, OEM site, and visibility inside AI answer engines." },
  DATA: { label: "Data & Attribution", desc: "Whether you can see what your spend actually produces." },
  LOCAL: { label: "Local & Brand DNA", desc: "GBP, reviews, foot traffic, and how Google reads you." },
};

export const PILLAR_ICON: Record<Exclude<Pillar, "SEGMENT">, string> = {
  SEARCH: "🔍",
  DATA: "📊",
  LOCAL: "📍",
};

export const SEGMENTS: Record<string, { head: string; sub: string }> = {
  BUDGET: {
    head: "Let's prove ROI before you spend a dime.",
    sub: "You flagged budget as your #1 concern, so we lead with return, not invoices.",
  },
  TRUST: {
    head: "Let's earn it with proof, not promises.",
    sub: "You flagged trust as your #1 concern, fair, after being burned. Every number is verifiable.",
  },
  COMPLACENT: {
    head: "Sales are good, let's protect that.",
    sub: "You said things feel fine right now. This is exactly how a hungry competitor erodes a comfortable lead.",
  },
  LEADS: {
    head: "Let's get you more qualified leads.",
    sub: "You flagged qualified lead volume as your #1 challenge, this is why the pipeline is thinner than it should be.",
  },
};
