import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Captures a lead and (optionally) forwards it to a CRM / Zapier / Make webhook.
 * Keeping this server-side means the webhook URL is never exposed to the browser.
 */
export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const hook = process.env.LEAD_WEBHOOK_URL;
  if (hook) {
    try {
      await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      // swallow — never block the user on a webhook failure
    }
  }

  // Always log server-side so leads aren't lost even without a webhook configured.
  console.log("[lead]", JSON.stringify(payload));
  return NextResponse.json({ ok: true });
}
