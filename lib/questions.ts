import type { Pillar, Question } from "./types";

/**
 * Each option scores 1 (worst) -> 4 (best).
 * Q4 (p: "SEGMENT") is non-ordinal and NOT scored — it themes the report.
 * Pillars: SEARCH (rank/AI/OEM), DATA (measurement), LOCAL (GBP/Brand DNA)
 */
export const QUESTIONS: Question[] = [
  {
    p: "SEARCH",
    q: "Do you know who's actually outranking you on Google in your market right now?",
    a: [
      "I don't really worry about Google rankings",
      "That's the OEM's job, not mine",
      "I doubt SEO moves the needle for car sales",
      "No, but I'd want to know exactly who's ahead of me",
    ],
  },
  {
    p: "DATA",
    q: "When your ad spend stays flat but your leads drop, do you know why?",
    a: [
      "It happens, but cutting back on marketing isn't an option I can question",
      "I just assume it's the market and ride it out",
      "I've been told before it's fixed and it wasn't",
      "No, and figuring that out would be worth a real conversation",
    ],
  },
  {
    p: "SEARCH",
    q: "How are you showing up when shoppers ask ChatGPT, Gemini, or Google's AI Overviews for the best place to buy?",
    a: [
      "Nobody's actually buying cars off ChatGPT",
      "My customers don't search like that",
      "Maybe later, that feels like a next-year problem",
      "I don't know, and that gap concerns me",
    ],
  },
  {
    p: "SEGMENT",
    q: "What's the biggest challenge you're dealing with on the digital side right now?",
    a: [
      "Honestly, budget, I can't add another spend line",
      "Trusting that any agency will actually deliver",
      "We're fine, sales are good right now",
      "Not enough qualified leads, and I want that solved",
    ],
    seg: ["BUDGET", "TRUST", "COMPLACENT", "LEADS"],
  },
  {
    p: "DATA",
    q: "Can your current agency show you exactly what they did last month and what it produced?",
    a: [
      "I pay a provider and assume it's handled",
      "No, and I've been burned by that before",
      "I get a report but can't tell what it's worth",
      "No, and that lack of proof bothers me",
    ],
  },
  {
    p: "DATA",
    q: "Do you know your true cost per lead from organic versus paid?",
    a: [
      "I'd need to see ROI before spending anything new",
      "I get plenty of leads from Cars.com and Autotrader anyway",
      "I've heard the cheaper-leads pitch before",
      "No, and knowing that number would change how I budget",
    ],
  },
  {
    p: "SEARCH",
    q: "How much of your traffic depends on paid ads that stop the moment you stop spending?",
    a: [
      "A lot, but ads are working, so why change it",
      "I can't justify shifting budget without a guarantee",
      "Every agency says they'll lower my paid dependence",
      "More than I'd like, and that worries me",
    ],
  },
  {
    p: "SEARCH",
    q: "Is your OEM website pulling the organic traffic it should, or leaking it to competitors?",
    a: [
      "The OEM handles the website, so it's not on me",
      "I don't think the website really drives sales",
      "I'd need proof it's leaking before I act",
      "I'm not sure, and I'd want that checked",
    ],
  },
  {
    p: "SEARCH",
    q: "When a competitor with less history outranks you locally, do you know what they're doing differently?",
    a: [
      "It bugs me, but I assume they just spend more",
      "I don't think rankings really affect my sales",
      "People have promised to fix this before",
      "No, and I'd genuinely want to know their playbook",
    ],
  },
  {
    p: "LOCAL",
    q: "Are your Google Business Profile and reviews translating into showroom visits, or just sitting there?",
    a: [
      "We already manage that in-house",
      "Reviews don't really change who walks in",
      "I can't add another thing to the budget right now",
      "Probably just sitting there, and that's a missed opportunity",
    ],
  },
  {
    p: "LOCAL",
    q: "Do you know how Google actually sees your dealership today, your Brand DNA?",
    a: [
      "That sounds like agency jargon to me",
      "Not sure that translates into actual car sales",
      "Interesting, but not a priority this quarter",
      "No, and I'd want to see what mine looks like",
    ],
  },
  {
    p: "LOCAL",
    q: "If we showed you three specific gaps holding your visibility back, would that change how you think about your current strategy?",
    a: [
      "I'd have to run it by the owner or GM first",
      "Maybe, but I'm skeptical it'd be worth it",
      "Not right now, too much going on",
      "Yes, show me, I'm ready to act",
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
