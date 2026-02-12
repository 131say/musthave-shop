import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function authedUserId() {
  const c = await cookies();
  const v = c.get("sb_userId")?.value ?? "";
  const id = Number(v);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function POST() {
  try {
    const userId = await authedUserId();
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    // Проверяем пользователя через прямой SQL для обхода проблем с типизацией Prisma
    const users = await prisma.$queryRaw<any[]>`
      SELECT id, referralsEnabled 
      FROM User 
      WHERE id = ${userId}
    `;
    
    if (!users || users.length === 0) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    
    const user = users[0];
    const referralsEnabled = Boolean(user.referralsEnabled);
    
    // Если доступ уже включен, не нужно отправлять запрос
    if (referralsEnabled) {
      return NextResponse.json({ ok: false, error: "Доступ уже включен" }, { status: 400 });
    }

    // Устанавливаем флаг запроса на активацию
    // Используем прямой SQL для обхода проблем с типизацией Prisma (как в других местах)
    await prisma.$executeRaw`UPDATE User SET referralActivationRequested = 1 WHERE id = ${userId}`;

    return NextResponse.json({ ok: true, message: "Запрос на активацию отправлен" });
  } catch (e: any) {
    console.error("POST /api/profile/referrals/request-activation error", e);
    console.error("Error details:", {
      message: e?.message,
      code: e?.code,
      meta: e?.meta,
      stack: e?.stack,
    });
    return NextResponse.json({ 
      ok: false, 
      error: "Server error",
      details: process.env.NODE_ENV === 'development' ? String(e?.message || e) : undefined
    }, { status: 500 });
  }
}

