import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function authedUserId() {
  const c = await cookies();
  const v = c.get("sb_userId")?.value ?? "";
  const id = Number(v);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function GET() {
  try {
    const userId = await authedUserId();
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    // Используем прямой SQL запрос для обхода проблем с типизацией Prisma
    const users = await prisma.$queryRaw<any[]>`
      SELECT id, referralCode, slotsTotal, slotsUsed, referralsEnabled 
      FROM User 
      WHERE id = ${userId}
    `;
    
    if (!users || users.length === 0) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    
    const user = users[0];
    const referralsEnabled = Boolean(user.referralsEnabled);
    
    // Приглашения не ограничены - возвращаем данные всегда
    // referralsEnabled теперь означает только статус 2 уровня (команда)
    // Убрана проверка referralsEnabled для возврата данных

    const invited = await prisma.user.count({ where: { referredByUserId: userId } });

    // DONE-заказы приглашённых
    const doneOrders = await prisma.order.count({
      where: {
        status: "DONE",
        user: { referredByUserId: userId },
      },
    });

    // сколько бонусов заработано по рефералам
    const earned = await prisma.referralEvent.aggregate({
      where: { userId, type: "ORDER_BONUS" },
      _sum: { amount: true },
    });

    return NextResponse.json({
      ok: true,
      referralCode: user.referralCode,
      invited,
      doneOrders,
      earnedBonus: earned._sum.amount ?? 0,
      slotsTotal: Number(user.slotsTotal) ?? 1,
      slotsUsed: Number(user.slotsUsed) ?? 0,
    });
  } catch (e: any) {
    console.error("GET /api/referrals/summary", e);
    console.error("Error details:", {
      message: e?.message,
      code: e?.code,
      meta: e?.meta,
    });
    return NextResponse.json({ 
      ok: false, 
      error: "Server error",
      details: process.env.NODE_ENV === 'development' ? String(e?.message || e) : undefined
    }, { status: 500 });
  }
}

