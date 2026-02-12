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

export async function GET(req: Request) {
  try {
    const userId = await authedUserId();
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    // Проверяем, является ли пользователь блоггером
    const users = await prisma.$queryRaw<any[]>`
      SELECT id, referralsEnabled 
      FROM User 
      WHERE id = ${userId}
    `;
    
    if (!users || users.length === 0) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    
    const user = users[0];
    if (!Boolean(user.referralsEnabled)) {
      return NextResponse.json({ ok: false, error: "Доступ только для блоггеров" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    
    // Поддержка как старого формата (days), так и нового (from/to)
    let from: Date;
    let to: Date;
    let days: number;
    
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    
    if (fromParam && toParam) {
      // Новый формат: конкретные даты
      from = new Date(fromParam);
      to = new Date(toParam);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    } else {
      // Старый формат: количество дней
      days = Math.max(1, Math.min(90, Number(searchParams.get("days") || 30)));
      to = new Date();
      from = new Date(to);
      from.setDate(from.getDate() - (days - 1));
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
    }

    // Получаем всех приглашённых пользователей
    const invitedUsers = await prisma.$queryRaw<any[]>`
      SELECT id, name, phone, login, createdAt 
      FROM User 
      WHERE referredByUserId = ${userId}
      ORDER BY createdAt DESC
    `;

    // Статистика за период
    const ordersInPeriod = await prisma.order.findMany({
      where: {
        createdAt: { gte: from },
        status: { not: 'CANCELLED' },
        user: { referredByUserId: userId },
      },
      select: { id: true, userId: true, totalAmount: true, createdAt: true },
    });

    // Статистика за все время
    const allOrders = await prisma.order.findMany({
      where: {
        user: { referredByUserId: userId },
      },
      select: { id: true, userId: true, totalAmount: true, status: true },
    });

    // Бонусы за период
    const bonusEventsInPeriod = await prisma.referralEvent.findMany({
      where: {
        userId: userId,
        type: "ORDER_BONUS",
        referredUserId: { not: null },
        createdAt: { gte: from },
      },
      select: { amount: true, referredUserId: true, createdAt: true },
    });

    // Бонусы за все время
    const allBonusEvents = await prisma.referralEvent.findMany({
      where: {
        userId: userId,
        type: "ORDER_BONUS",
        referredUserId: { not: null },
      },
      select: { amount: true },
    });

    // Группируем по приглашённым пользователям
    const invitedStats = await Promise.all(
      invitedUsers.map(async (invitedUser: any) => {
        const invitedUserId = Number(invitedUser.id);
        
        // Заказы за период
        const userOrdersInPeriod = ordersInPeriod.filter(o => o.userId === invitedUserId);
        const revenueInPeriod = userOrdersInPeriod.reduce((sum, o) => sum + o.totalAmount, 0);
        const ordersCountInPeriod = userOrdersInPeriod.length;
        
        // Заказы за все время
        const userAllOrders = allOrders.filter(o => o.userId === invitedUserId);
        const doneOrders = userAllOrders.filter(o => o.status === 'DONE').length;
        const totalRevenue = userAllOrders.reduce((sum, o) => sum + o.totalAmount, 0);
        
        // Бонусы за период
        const userBonusInPeriod = bonusEventsInPeriod
          .filter(e => e.referredUserId === invitedUserId)
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        
        // Бонусы за все время
        const userAllBonus = allBonusEvents
          .filter(e => e.referredUserId === invitedUserId)
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        return {
          id: invitedUser.id,
          name: invitedUser.name,
          phone: invitedUser.phone,
          login: invitedUser.login,
          createdAt: invitedUser.createdAt,
          // За период
          revenueInPeriod,
          ordersCountInPeriod,
          bonusInPeriod: userBonusInPeriod,
          // За все время
          doneOrders,
          totalRevenue,
          totalBonus: userAllBonus,
          avgOrderValue: doneOrders > 0 ? Math.round(totalRevenue / doneOrders) : 0,
        };
      })
    );

    // Общая статистика
    const totalInvited = invitedUsers.length;
    const invitedInPeriod = invitedUsers.filter((u: any) => new Date(u.createdAt) >= from).length;
    const totalRevenueInPeriod = ordersInPeriod.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrdersInPeriod = ordersInPeriod.length;
    
    // Оборот за всё время (только DONE заказы)
    const doneOrdersAllTime = allOrders.filter(o => o.status === 'DONE');
    const totalRevenueAllTime = doneOrdersAllTime.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrdersAllTime = doneOrdersAllTime.length;
    
    const totalBonusInPeriod = bonusEventsInPeriod.reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalBonusAllTime = allBonusEvents.reduce((sum, e) => sum + (e.amount || 0), 0);
    const avgOrderValue = totalOrdersInPeriod > 0 ? Math.round(totalRevenueInPeriod / totalOrdersInPeriod) : 0;
    const avgOrderValueAllTime = totalOrdersAllTime > 0 ? Math.round(totalRevenueAllTime / totalOrdersAllTime) : 0;
    const conversionRate = totalInvited > 0 ? Math.round((totalOrdersInPeriod / totalInvited) * 100) : 0;
    const conversionRateAllTime = totalInvited > 0 ? Math.round((totalOrdersAllTime / totalInvited) * 100) : 0;

    // Статистика по дням за период (для графика)
    const dailyStats = new Map<string, { revenue: number; orders: number; bonus: number }>();
    const currentDate = new Date(from);
    while (currentDate <= to) {
      const dateKey = currentDate.toISOString().slice(0, 10);
      dailyStats.set(dateKey, { revenue: 0, orders: 0, bonus: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    ordersInPeriod.forEach(order => {
      const dateKey = new Date(order.createdAt).toISOString().slice(0, 10);
      const stats = dailyStats.get(dateKey);
      if (stats) {
        stats.revenue += order.totalAmount;
        stats.orders += 1;
      }
    });

    bonusEventsInPeriod.forEach(event => {
      const dateKey = new Date(event.createdAt).toISOString().slice(0, 10);
      const stats = dailyStats.get(dateKey);
      if (stats) {
        stats.bonus += event.amount || 0;
      }
    });

    const dailyStatsArray = Array.from(dailyStats.entries()).map(([date, stats]) => ({
      date,
      revenue: stats.revenue,
      orders: stats.orders,
      bonus: stats.bonus,
    }));

    return NextResponse.json({
      ok: true,
      period: {
        days,
        from: from.toISOString(),
        to: to.toISOString(),
      },
      summary: {
        totalInvited,
        invitedInPeriod,
        totalRevenueInPeriod,
        totalOrdersInPeriod,
        totalRevenueAllTime,
        totalOrdersAllTime,
        totalBonusInPeriod,
        totalBonusAllTime,
        avgOrderValue,
        avgOrderValueAllTime,
        conversionRate,
        conversionRateAllTime,
      },
      invitedStats,
      dailyStats: dailyStatsArray,
    });
  } catch (e: any) {
    console.error("GET /api/profile/referrals/advanced-analytics error", e);
    return NextResponse.json({ 
      ok: false, 
      error: "Server error",
      details: process.env.NODE_ENV === 'development' ? String(e?.message || e) : undefined
    }, { status: 500 });
  }
}

