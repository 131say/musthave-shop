export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { recommendProducts } from "@/lib/assist";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Bad JSON" }, { status: 400 });

    const scenarioId = String(body.scenarioId || "").trim();
    const valueSlugs = Array.isArray(body.valueSlugs) ? body.valueSlugs : [];
    const limit = body.limit;

    if (!scenarioId) return NextResponse.json({ error: "scenarioId required" }, { status: 400 });

    const items = await recommendProducts({
      scenarioId,
      valueSlugs,
      limit,
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    console.error("assist/recommend error", e);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: process.env.NODE_ENV !== "production" ? (e?.message || String(e)) : undefined,
      },
      { status: 500 }
    );
  }
}



