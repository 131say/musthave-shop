import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function getUserIdFromCookie(): Promise<number | null> {
  const c = await cookies();
  const v = c.get("sb_userId")?.value ?? "";
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET() {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Используем прямой SQL запрос для обхода проблем с типизацией Prisma
    const users = await prisma.$queryRaw<any[]>`
      SELECT id, name, phone, address, "referralsEnabled", "referralActivationRequested", "referralCode", "onboardingCompletedAt", "referredByUserId"
      FROM "User" 
      WHERE id = ${userId}
    `;
    
    if (!users || users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = users[0];
    // Преобразуем boolean из SQLite (0/1) в true/false
    return NextResponse.json({ 
      ok: true, 
      profile: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        address: user.address,
        referralCode: user.referralCode,
        referralsEnabled: Boolean(user.referralsEnabled),
        referralActivationRequested: Boolean(user.referralActivationRequested),
        onboardingCompletedAt: user.onboardingCompletedAt || null,
        referredByUserId: user.referredByUserId != null ? Number(user.referredByUserId) : null,
      }
    });
  } catch (e: any) {
    console.error("GET /api/profile error:", e);
    console.error("Error details:", {
      message: e?.message,
      code: e?.code,
      meta: e?.meta,
    });
    return NextResponse.json({ 
      error: "Server error",
      details: process.env.NODE_ENV === 'development' ? String(e?.message || e) : undefined
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Bad JSON" }, { status: 400 });

    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
    const address = typeof body.address === "string" ? body.address.trim() : undefined;

    const data: any = {};
    if (name !== undefined) data.name = name || null;
    if (phone !== undefined) data.phone = phone || "";
    if (address !== undefined) data.address = address || null;

    // ничего не меняем
    if (!Object.keys(data).length) return NextResponse.json({ ok: true });

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, phone: true, address: true } as any,
    });

    return NextResponse.json({ ok: true, profile: updated });
  } catch (e) {
    console.error("POST /api/profile error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await getUserIdFromCookie();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Bad JSON" }, { status: 400 });

    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
    const address = typeof body.address === "string" ? body.address.trim() : undefined;

    const data: any = {};
    if (name !== undefined) data.name = name || null;
    if (phone !== undefined) data.phone = phone || "";
    if (address !== undefined) data.address = address || null;

    // ничего не меняем
    if (!Object.keys(data).length) return NextResponse.json({ ok: true });

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, phone: true, address: true } as any,
    });

    return NextResponse.json({ ok: true, profile: updated });
  } catch (e) {
    console.error("PATCH /api/profile error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
