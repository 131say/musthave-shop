import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userIdRaw = (url.searchParams.get("userId") ?? "").trim();
    const userId = userIdRaw ? Number(userIdRaw) : NaN;
    if (!userId || !Number.isFinite(userId)) return NextResponse.json({ ok: true, events: [], balance: 0 });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ ok: true, events: [], balance: 0 });

    const events = await prisma.referralEvent.findMany({
      where: { userId: user.id },
      include: {
        referredUser: {
          select: {
            id: true,
            name: true,
            phone: true,
            login: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ ok: true, events, balance: user.bonusBalance });
  } catch (e) {
    console.error("GET /api/profile/bonus-events error", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

