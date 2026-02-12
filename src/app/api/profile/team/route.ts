export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { checkLevel2UnlockCondition } from "@/lib/referral-level2";

async function authedUserId() {
  const c = await cookies();
  const v = c.get("sb_userId")?.value ?? "";
  const id = Number(v);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * API для вкладки "Команда" в кабинете
 * Возвращает:
 * - Список рефералов L1 (всегда, независимо от статуса 2 уровня)
 * - Количество активных рефералов
 * - Статус 2 уровня (открыт/закрыт)
 * - Условие открытия (если закрыт)
 */
export async function GET() {
  try {
    const userId = await authedUserId();
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    // Получаем данные пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, referralsEnabled: true, referralCode: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    // Получаем всех рефералов L1 (прямых)
    const l1Referrals = await prisma.user.findMany({
      where: { referredByUserId: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        login: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Для каждого реферала проверяем, активен ли он (есть ли хотя бы 1 заказ DONE)
    const referralsWithStats = await Promise.all(
      l1Referrals.map(async (ref) => {
        const doneOrdersCount = await prisma.order.count({
          where: {
            userId: ref.id,
            status: "DONE",
          },
        });

        const isActive = doneOrdersCount > 0;

        // Бонусы, заработанные с этого реферала
        const bonusEvents = await prisma.referralEvent.findMany({
          where: {
            userId: userId, // пригласитель
            referredUserId: ref.id,
            type: "ORDER_BONUS",
          },
          select: { amount: true },
        });
        const earnedBonus = bonusEvents.reduce((sum, e) => sum + (e.amount || 0), 0);

        return {
          id: ref.id,
          name: ref.name,
          phone: ref.phone,
          login: ref.login,
          createdAt: ref.createdAt.toISOString(),
          isActive,
          doneOrdersCount,
          earnedBonus,
        };
      })
    );

    // Подсчитываем активных рефералов
    const activeCount = referralsWithStats.filter((r) => r.isActive).length;

    // Проверяем условие открытия 2 уровня (если ещё не открыт)
    let level2Status: "open" | "closed" = user.referralsEnabled ? "open" : "closed";
    let level2ConditionMet = false;
    let level2ConditionText = "";

    if (!user.referralsEnabled) {
      level2ConditionMet = await checkLevel2UnlockCondition(userId);
      if (level2ConditionMet) {
        level2ConditionText = "Условие выполнено! 2 уровень будет открыт автоматически.";
      } else {
        const needed = Math.max(0, 3 - activeCount);
        level2ConditionText = `Нужно ещё ${needed} активных реферала для открытия 2 уровня`;
      }
    }

    return NextResponse.json({
      ok: true,
      referralCode: user.referralCode,
      referrals: referralsWithStats,
      activeCount,
      totalCount: referralsWithStats.length,
      level2Status,
      level2ConditionMet,
      level2ConditionText,
    });
  } catch (e: any) {
    console.error("GET /api/profile/team error", e);
    return NextResponse.json(
      {
        ok: false,
        error: "Server error",
        details: process.env.NODE_ENV === "development" ? String(e?.message || e) : undefined,
      },
      { status: 500 }
    );
  }
}
