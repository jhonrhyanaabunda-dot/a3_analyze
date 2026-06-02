export type Pillar = "SEARCH" | "DATA" | "LOCAL" | "SEGMENT";

export interface Question {
  p: Pillar;
  q: string;
  a: string[];
  /** present only on the SEGMENT question; maps each option to a segment key */
  seg?: string[];
}

export interface Lead {
  name: string;
  dealership: string;
  email: string;
  website: string;
  city: string;
  phone?: string;
}

export interface OnPageAudit {
  score: number;
  checks: Record<string, boolean>;
  title: string;
  finalUrl: string;
}

export interface Competitor {
  /** the real competing dealership rooftop ranking above this dealer */
  name: string;
  /** the actual search term it outranks them for */
  term: string;
}

export interface Finding {
  severity: "good" | "warn" | "bad";
  text: string;
}

export interface AiVisibility {
  score: number | null;
  ai_score: number | null;
  local_score: number | null;
  /** estimated typical visibility of competing dealers in this market (0-100) */
  market_average: number | null;
  foundInAI: boolean;
  summary: string;
  /** real evidence (grounded) */
  rating: number | null;
  review_count: number | null;
  gbp: string | null;
  /** estimated monthly local search volume for the dealer's core buying terms (null if unknown) */
  local_search_volume: number | null;
  competitors: Competitor[];
  findings: Finding[];
}

export interface RealData {
  overall: number;
  siteHealth: number | null;
  site: OnPageAudit | null;
  ai: AiVisibility | null;
  /** which sources actually returned data this run */
  sources: { onpage: boolean; gemini: boolean };
}

export interface AnalyzeRequest {
  url: string;
  brand: string;
  city: string;
}

export interface AnalyzeResponse {
  ok: boolean;
  data?: RealData;
  error?: string;
}

export interface Tone {
  c: string;
  bg: string;
  label: string;
}

export interface Tier {
  b: string;
  t: string;
  d: string;
}
