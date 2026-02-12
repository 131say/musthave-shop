export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    // Проверяем доступ к рефералам через прямой SQL
    const users = await prisma.$queryRaw<any[]>`
      SELECT id, referralsEnabled 
      FROM User 
      WHERE id = ${userId}
    `;
    
    if (!users || users.length === 0) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    
    const user = users[0];
    // Приглашения не ограничены - возвращаем список всегда
    // referralsEnabled теперь означает только статус 2 уровня (команда)

    // Получаем всех приглашённых пользователей через прямой SQL
    const invitedUsers = await prisma.$queryRaw<any[]>`
      SELECT id, name, phone, login, createdAt 
      FROM User 
      WHERE referredByUserId = ${userId}
      ORDER BY createdAt DESC
    `;

    // Получаем статистику для каждого приглашённого
    const usersWithStats = await Promise.all(
      invitedUsers.map(async (user: any) => {
        const userIdNum = Number(user.id);
        // Количество DONE заказов
        const doneOrders = await prisma.order.count({
          where: {
            userId: userIdNum,
            status: "DONE",
          } as any,
        });

        // Общая сумма DONE заказов
        const orders = await prisma.order.findMany({
          where: {
            userId: userIdNum,
            status: "DONE",
          } as any,
          select: { totalAmount: true },
        });
        const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

        // Бонусы, заработанные с этого пользователя
        const bonusEvents = await prisma.referralEvent.findMany({
          where: {
            userId: userId, // пригласитель
            referredUserId: userIdNum,
            type: "ORDER_BONUS",
          } as any,
          select: { amount: true },
        });
        const earnedBonus = bonusEvents.reduce((sum, e) => sum + (e.amount || 0), 0);

        return {
          ...user,
          doneOrders,
          totalRevenue,
          earnedBonus,
        };
      })
    );

    return NextResponse.json({ ok: true, invited: usersWithStats });
  } catch (e: any) {
    console.error("GET /api/profile/referrals/invited error", e);
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

