import type { Pillar, Question } from "./types";

/**
 * Each option scores 1 (worst, in denial) -> 4 (best, aware and ready to act).
 * All 12 questions are scored. Pillars: SEARCH (rank/AI/OEM), DATA (measurement),
 * LOCAL (GBP/reviews/Brand DNA) — 4 questions each, for the weakest-pillar nudge.
 */
export const QUESTIONS: Question[] = [
  {
    p: "SEARCH",
    q: "Right now, buyers in your area are calling a competitor that shows up before you. How many of those sales are you losing every month?",
    a: [
      "None that I know of, I figure I get my share",
      "Probably some, but I've never put a number on it",
      "Enough that it bugs me, I just can't prove how many",
      "No idea, and that blind spot could be costing me real deals",
    ],
  },
  {
    p: "DATA",
    q: "Your marketing spend hasn't dropped, but your leads have. That's buyers you paid for and never got. Do you know where they went?",
    a: [
      "My leads are fine, I'm not losing any",
      "Maybe a few slip, but nothing serious",
      "I've lost leads before and never found out why",
      "No, and paying for buyers I never receive is a problem",
    ],
  },
  {
    p: "SEARCH",
    q: "When AI recommends a dealer and it isn't you, that buyer drives to your competitor's lot. Do you know how many sales AI is quietly handing away?",
    a: [
      "Zero, my buyers don't use AI",
      "Maybe a handful, but it can't be many",
      "It could be happening and I'd never see it",
      "No, and losing sales I can't even track scares me",
    ],
  },
  {
    p: "DATA",
    q: "Be honest: what's the real reason your store isn't closing more deals from online shoppers?",
    a: [
      "We're closing plenty, no deals are slipping",
      "A few get away but that's just the business",
      "I lose deals online and can't pinpoint why",
      "I'm leaving real money on the table and want it fixed",
    ],
  },
  {
    p: "DATA",
    q: "You pay your agency every month. Can they prove a single sale or lead came from it, or are you funding work that never reached your bottom line?",
    a: [
      "I assume the sales are there somewhere",
      "They show me activity, but not actual deals",
      "I've paid for results I never saw land",
      "No proof of a single sale, and that's money lost",
    ],
  },
  {
    p: "DATA",
    q: "Every lead has a price. If you don't know yours, you don't know how much profit you're leaving on each deal. Do you know your number?",
    a: [
      "Doesn't matter to me, the deals still close",
      "I know roughly, close enough",
      "I've overpaid for leads and felt it on margin",
      "No, and that means profit is leaking on every deal",
    ],
  },
  {
    p: "SEARCH",
    q: "The day you stop paying for ads, do your buyers vanish with them? That's not marketing, that's renting customers.",
    a: [
      "They'd keep coming, I'm not worried",
      "Some would stay, some would drop",
      "I've felt the drop the moment ads paused",
      "They'd mostly vanish, and that's rented sales, not owned ones",
    ],
  },
  {
    p: "LOCAL",
    q: "Shoppers are landing on your site, leaving without a word, and buying down the street. Do you know how many buyers you're losing at your own front door?",
    a: [
      "None, my site converts fine",
      "A few bounce, but most stick",
      "I know they leave, I just can't say how many sales it costs",
      "No idea, and losing buyers at my own door is unacceptable",
    ],
  },
  {
    p: "LOCAL",
    q: "A smaller store with less history is stealing buyers that should be yours. Do you know what they're doing to take your sales?",
    a: [
      "Nobody's taking my buyers",
      "Maybe a few, but I'm still ahead",
      "They're pulling deals from me and I can't see how",
      "No, and watching sales walk to a smaller store stings",
    ],
  },
  {
    p: "LOCAL",
    q: "Shoppers compare reviews before they ever call. If a competitor's profile looks stronger, that buyer never reaches you. Is yours winning them or losing them?",
    a: [
      "Winning, my reviews are fine",
      "They're okay, probably not costing me much",
      "I've likely lost buyers to better-looking competitors",
      "Losing them, and those are calls I'll never even get",
    ],
  },
  {
    p: "SEARCH",
    q: "Google and AI decide which dealer gets the ready-to-buy shopper. If they don't trust your store, that sale goes elsewhere. Do you know what they see?",
    a: [
      "I get found fine, no sales lost there",
      "Maybe a few slip through the cracks",
      "If they don't trust me, I'd never know the deals I missed",
      "No idea what they see, and that could be costing me buyers daily",
    ],
  },
  {
    p: "LOCAL",
    q: "If we showed you the exact number of buyers and deals you're losing to competitors each month, would that finally change your strategy?",
    a: [
      "I doubt I'm losing enough to matter",
      "Maybe, if the number's real",
      "If it's costing me actual deals, I'd have to act",
      "Yes, show me the lost sales and I'll move now",
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
