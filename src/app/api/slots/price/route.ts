export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextSlotPriceForUser } from "@/lib/slots";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.phone) return NextResponse.json({ error: "phone required" }, { status: 400 });
    const phone = String(body.phone).trim();
    if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { nextSlotNumber, price } = await getNextSlotPriceForUser(user.slotsTotal);
    return NextResponse.json({ ok: true, nextSlotNumber, price });
  } catch (e: any) {
    console.error("slots/price error", e);
    return NextResponse.json(
      {
        error: "Внутренняя ошибка сервера",
        details: process.env.NODE_ENV !== "production" ? (e?.message || String(e)) : undefined,
      },
      { status: 500 }
    );
  }
}






