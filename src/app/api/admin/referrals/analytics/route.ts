export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";

type ReferralEventRow = {
  id: number;
  userId: number;
  referredUserId: number | null;
  orderId: number | null;
  type: string;
  amount: number;
  createdAt: Date;
  note: string | null;
  user?: { email: string | null; name: string | null; phone: string | null } | null;
  order?: { userId: number | null; cashPaid: number } | null;
};

function num(v: any, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampInt(v: any, min: number, max: number, fallback: number) {
  const n = Math.trunc(num(v, fallback));
  return Math.min(max, Math.max(min, n));
}

function dateKeyAlmaty(d: Date): string {
  // YYYY-MM-DD in Asia/Almaty
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Almaty",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d);
}

// Business mapping:
// - ORDER_BONUS:
//    - cashback if event.userId === order.userId (покупатель сам получает кэшбэк)
//    - L1 if referredUserId !== null (реферер получает бонус)
// - LEVEL_BONUS: L2
function classify(e: ReferralEventRow): "cashback" | "l1" | "l2" | "other" {
  if (e.type === "LEVEL_BONUS") return "l2";
  if (e.type === "ORDER_BONUS") {
    const orderBuyerId = e.order?.userId ?? null;
    // Если userId события совпадает с userId заказа - это cashback покупателя
    if (orderBuyerId && Number(e.userId) === Number(orderBuyerId)) return "cashback";
    // Если есть referredUserId - это L1 бонус реферера
    if (e.referredUserId !== null) return "l1";
    // Fallback: если нет referredUserId, но userId != order.userId - тоже L1
    return "l1";
  }
  return "other";
}

export async function GET(req: Request) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;

    const url = new URL(req.url);
    const days = clampInt(url.searchParams.get("days"), 1, 365, 30);
    const top = clampInt(url.searchParams.get("top"), 1, 200, 20);

    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const events = (await prisma.referralEvent.findMany({
      where: { createdAt: { gte: from } },
      select: {
        id: true,
        userId: true,
        referredUserId: true,
        orderId: true,
        type: true,
        amount: true,
        createdAt: true,
        note: true,
        user: { select: { email: true, name: true, phone: true } },
        order: { select: { userId: true, cashPaid: true } },
      },
      orderBy: { createdAt: "asc" },
    })) as unknown as ReferralEventRow[];

    // Totals
    let cashback = 0;
    let l1 = 0;
    let l2 = 0;
    let other = 0;

    // Timeline: date -> sums
    const timelineMap = new Map<
      string,
      { date: string; cashback: number; l1: number; l2: number; other: number }
    >();

    // Top referrers (exclude cashback)
    type RefAgg = {
      userId: number;
      email: string | null;
      name: string | null;
      phone: string | null;
      l1Bonus: number;
      l2Bonus: number;
      bonusTotal: number;
      // unique orders that generated L1/L2 for this referrer
      orderIds: Set<number>;
      // total cashPaid of those orders (from meta.cashPaid)
      turnoverCashPaid: number;
    };
    const refMap = new Map<number, RefAgg>();

    // L1 vs L2 order counts (unique orderIds)
    const l1Orders = new Set<number>();
    const l2Orders = new Set<number>();
    const orderIdsInPeriod = new Set<number>();

    // For turnover dedupe per (referrerId, orderId)
    const seenRefOrder = new Set<string>();

    for (const e of events) {
      if (e.orderId != null) orderIdsInPeriod.add(e.orderId);
      const bucket = classify(e);
      const amt = num(e.amount, 0);

      if (bucket === "cashback") cashback += amt;
      else if (bucket === "l1") l1 += amt;
      else if (bucket === "l2") l2 += amt;
      else other += amt;

      const dk = dateKeyAlmaty(e.createdAt);
      const row =
        timelineMap.get(dk) ??
        { date: dk, cashback: 0, l1: 0, l2: 0, other: 0 };
      if (bucket === "cashback") row.cashback += amt;
      else if (bucket === "l1") row.l1 += amt;
      else if (bucket === "l2") row.l2 += amt;
      else row.other += amt;
      timelineMap.set(dk, row);

      // Referrer aggregates (exclude cashback + exclude unknown types)
      if (bucket === "l1" || bucket === "l2") {
        const userId = e.userId;
        const existing =
          refMap.get(userId) ??
          ({
            userId,
            email: e.user?.email ?? null,
            name: e.user?.name ?? null,
            phone: e.user?.phone ?? null,
            l1Bonus: 0,
            l2Bonus: 0,
            bonusTotal: 0,
            orderIds: new Set<number>(),
            turnoverCashPaid: 0,
          } satisfies RefAgg);

        if (bucket === "l1") existing.l1Bonus += amt;
        if (bucket === "l2") existing.l2Bonus += amt;
        existing.bonusTotal += amt;

        const orderId = e.orderId ?? null;
        if (orderId) {
          existing.orderIds.add(orderId);

          if (bucket === "l1") l1Orders.add(orderId);
          if (bucket === "l2") l2Orders.add(orderId);

          // turnover from order.cashPaid
          // dedupe per referrer+orderId
          const key = `${userId}:${orderId}`;
          if (!seenRefOrder.has(key)) {
            seenRefOrder.add(key);
            const cashPaid = num(e?.order?.cashPaid, 0);
            existing.turnoverCashPaid += cashPaid;
          }
        }

        refMap.set(userId, existing);
      }
    }

    // Общий оборот cashPaid по заказам за период (уникальные orderId из событий)
    const ids = Array.from(orderIdsInPeriod);
    let totalCashPaid = 0;
    if (ids.length > 0) {
      const orders = await prisma.order.findMany({
        where: { id: { in: ids } },
        select: { id: true, cashPaid: true },
      });
      for (const o of orders) {
        totalCashPaid += num(o.cashPaid, 0);
      }
    }
    const allBonuses = cashback + l1 + l2 + other;
    const bonusCostRate = totalCashPaid > 0 ? allBonuses / totalCashPaid : 0;

    const timeline = Array.from(timelineMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const topReferrers = Array.from(refMap.values())
      .map((r) => ({
        userId: Number(r.userId),
        email: r.email,
        name: r.name,
        phone: r.phone,
        ordersCount: r.orderIds.size,
        turnoverCashPaid: r.turnoverCashPaid,
        bonusTotal: r.bonusTotal,
        l1Bonus: r.l1Bonus,
        l2Bonus: r.l2Bonus,
      }))
      .sort((a, b) => b.bonusTotal - a.bonusTotal)
      .slice(0, top);

    return NextResponse.json({
      period: { days, from: from.toISOString() },
      totals: {
        cashback,
        l1,
        l2,
        other,
        all: allBonuses,
      },
      turnover: {
        totalCashPaid,
        bonusCostRate, // 0.07 = 7%
      },
      l1VsL2: {
        l1Amount: l1,
        l2Amount: l2,
        l1Orders: l1Orders.size,
        l2Orders: l2Orders.size,
      },
      topReferrers,
      timeline,
    });
  } catch (e: any) {
    console.error("referrals analytics error:", e);
    return NextResponse.json(
      {
        error: "Analytics failed",
        details: process.env.NODE_ENV !== "production" ? String(e?.message || e) : undefined,
      },
      { status: 500 }
    );
  }
}
