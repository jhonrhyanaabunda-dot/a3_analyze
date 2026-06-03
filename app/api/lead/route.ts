import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Captures a lead and (optionally) forwards it to a CRM / Zapier / Make webhook.
 * Keeping this server-side means the webhook URL is never exposed to the browser.
 */
type LeadPayload = {
  lead?: { name?: string; dealership?: string; email?: string; website?: string; city?: string; phone?: string };
  quizScore?: number;
  segment?: string;
  phase?: string;
  visibilityScore?: number;
  siteHealth?: number;
  foundInSearch?: boolean | null;
  topCompetitor?: string | null;
  source?: string;
};

// one-line summary so a Slack/email/CRM notification is readable at a glance
function summarize(p: LeadPayload): string {
  const who = [p.lead?.dealership, p.lead?.name].filter(Boolean).join(" — ") || p.lead?.email || "Unknown lead";
  if (p.phase === "analysis") {
    const bits = [
      p.visibilityScore != null ? `score ${p.visibilityScore}/100` : null,
      p.foundInSearch === false ? "not surfacing in search" : p.foundInSearch ? "surfacing in search" : null,
      p.topCompetitor ? `outranked by ${p.topCompetitor}` : null,
    ].filter(Boolean);
    return `Scan complete for ${who}${bits.length ? ": " + bits.join(", ") : ""}`;
  }
  const bits = [
    p.quizScore != null ? `quiz ${p.quizScore}/100` : null,
    p.segment ? `focus: ${p.segment}` : null,
  ].filter(Boolean);
  return `New lead — ${who}${bits.length ? " (" + bits.join(", ") + ")" : ""}`;
}

export async function POST(req: Request) {
  let payload: LeadPayload;
  try {
    payload = (await req.json()) as LeadPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const enriched = {
    ...payload,
    summary: summarize(payload),
    receivedAt: new Date().toISOString(),
  };

  const hook = process.env.LEAD_WEBHOOK_URL;
  if (hook) {
    try {
      await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enriched),
      });
    } catch {
      // swallow — never block the user on a webhook failure
    }
  }

  // Always log server-side so leads aren't lost even without a webhook configured.
  console.log("[lead]", JSON.stringify(enriched));
  return NextResponse.json({ ok: true });
}
