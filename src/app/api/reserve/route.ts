export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getReserveStatus } from "@/lib/reserve";

export async function GET() {
  try {
    const r = await getReserveStatus();
    return NextResponse.json({ ok: true, reserve: r });
  } catch (e: any) {
    console.error("reserve GET error", e);
    return NextResponse.json(
      {
        error: "Внутренняя ошибка сервера",
        details: process.env.NODE_ENV !== "production" ? (e?.message || String(e)) : undefined,
      },
      { status: 500 }
    );
  }
}






