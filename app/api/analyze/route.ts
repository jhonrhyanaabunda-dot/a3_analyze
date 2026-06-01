import { NextResponse } from "next/server";
import { normalizeUrl, realAnalyze } from "@/lib/realData";
import type { AnalyzeResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse<AnalyzeResponse>> {
  let body: { url?: string; brand?: string; city?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const url = normalizeUrl(body.url || "");
  const brand = (body.brand || "").trim();
  const city = (body.city || "").trim();

  if (!url) {
    return NextResponse.json({ ok: false, error: "A website is required" }, { status: 400 });
  }

  try {
    const data = await realAnalyze({ url, brand, city });
    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Analysis failed" },
      { status: 502 }
    );
  }
}
