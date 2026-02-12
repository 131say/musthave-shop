// src/lib/stats.ts
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

type OrderStatus = "NEW" | "PROCESSING" | "DONE" | "CANCELLED";

function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export async function getStats(days = 30) {
  const now = new Date();
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const settings = await getSettings();
  const reservePercent = Number(settings.reservePercent ?? 30);
  const customerPercent = Number(settings.customerPercent ?? 3);
  const inviterPercent = Number(settings.inviterPercent ?? 5);
  const allowFullBonusPay = Boolean(settings.allowFullBonusPay);

  // Orders (exclude CANCELLED)
  const whereOrders = {
    createdAt: { gte: from },
    NOT: { status: "CANCELLED" as OrderStatus },
  };

  // ORDERS + ITEMS (for COGS, revenue, daily)
  const orders = await prisma.order.findMany({
    where: whereOrders,
    include: {
      items: { include: { product: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const dailyMap = new Map<
    string,
    { date: string; orders: number; revenue: number; cogs: number; grossProfit: number }
  >();

  let revenue = 0; // cashPaid + bonusSpent
  let cashIn = 0;  // cashPaid only
  let bonusPaid = 0; // bonusSpent only
  let reservedCash = 0; // cashIn * reservePercent
  let reserveGap = 0; // reservedCash - reserveNeeded
  let cogs = 0;

  for (const o of orders) {
    const oCash = o.cashPaid ?? 0;
    const oBonus = o.bonusSpent ?? 0;
    const oRevenue = oCash + oBonus;

    cashIn += oCash;
    bonusPaid += oBonus;
    revenue += oRevenue;

    let oCogs = 0;
    for (const it of o.items) {
      const cp = it.product?.costPrice ?? 0;
      oCogs += (it.quantity ?? 0) * cp;
    }
    cogs += oCogs;

    const k = dayKey(o.createdAt);
    const prev = dailyMap.get(k) ?? { date: k, orders: 0, revenue: 0, cogs: 0, grossProfit: 0 };
    prev.orders += 1;
    prev.revenue += oRevenue;
    prev.cogs += oCogs;
    prev.grossProfit += oRevenue - oCogs;
    dailyMap.set(k, prev);
  }

  const grossProfit = revenue - cogs;

  // Bonuses issued (only ORDER_BONUS). If event tied to orderId, ensure order not CANCELLED.
  const bonusEvents = await prisma.referralEvent.findMany({
    where: {
      createdAt: { gte: from },
      type: "ORDER_BONUS",
    },
    select: { amount: true, orderId: true },
  });

  let bonusesIssued = 0;
  const bonusOrderIds = bonusEvents.map((e) => e.orderId).filter(Boolean) as number[];
  let nonCancelledBonusOrderId = new Set<number>();
  if (bonusOrderIds.length) {
    const okOrders = await prisma.order.findMany({
      where: { id: { in: bonusOrderIds }, NOT: { status: "CANCELLED" as OrderStatus } },
      select: { id: true },
    });
    nonCancelledBonusOrderId = new Set(okOrders.map((o) => o.id));
  }

  for (const e of bonusEvents) {
    if (e.orderId && !nonCancelledBonusOrderId.has(e.orderId)) continue;
    bonusesIssued += Number(e.amount || 0);
  }

  const netProfit = grossProfit - bonusesIssued;

  // Reserve Needed / Liability = SUM(user.bonusBalance)
  const aggUsers = await prisma.user.aggregate({
    _sum: { bonusBalance: true },
  });
  const reserveNeeded = Number(aggUsers._sum.bonusBalance || 0);

  reservedCash = Math.round((cashIn * reservePercent) / 100);
  reserveGap = reservedCash - reserveNeeded;

  // Risk ratio = reserveNeeded / max(cashIn, 1)
  const reserveRatio = reserveNeeded / Math.max(cashIn, 1);

  const riskHint =
    reserveGap < 0
      ? "Резерва не хватает: бонусами лучше не давать оплачивать и/или снизить проценты/повысить резерв."
      : reserveGap === 0
        ? "Резерв ровно по плану: любые повышения процентов увеличат риск."
        : "Есть запас по резерву: можно развивать, но следи за Reserve Gap.";

  const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  return {
    days,
    from: from.toISOString(),
    to: now.toISOString(),

    // core money
    ordersCount: orders.length,
    revenue,
    cashIn,
    bonusPaid,
    cogs,
    grossProfit,
    bonusesIssued,
    netProfit,
    reserveNeeded,
    reserveRatio,
    reservePercent,
    reservedCash,
    reserveGap,

    settings: {
      customerPercent,
      inviterPercent,
      allowFullBonusPay,
      reservePercent,
    },

    hints: { riskHint },

    daily,
  };
}

