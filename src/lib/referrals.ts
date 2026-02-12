import { prisma } from '@/lib/prisma';

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export type ReferralsKpis = {
  days: number;
  from: string;
  to: string;
  invitedTop: Array<{
    userId: number;
    phone: string;
    referralCode: string;
    invitedCount: number;
  }>;
  teamRevenueTop: Array<{
    userId: number;
    phone: string;
    referralCode: string;
    teamOrders: number;
    teamRevenue: number;
  }>;
  inviterBonusTop: Array<{
    userId: number;
    phone: string;
    referralCode: string;
    inviterBonus: number;
  }>;
  // Расширенная аналитика для выплат инфлюенсерам
  influencersDetailed: Array<{
    userId: number;
    phone: string;
    name: string | null;
    referralCode: string;
    referralsEnabled: boolean;
    invitedCount: number; // всего приглашено
    invitedInPeriod: number; // приглашено за период
    teamRevenue: number; // оборот команды за период
    teamOrders: number; // заказов команды за период
    inviterBonus: number; // заработано бонусов за период
    totalBonusEarned: number; // всего заработано бонусов (все время)
    avgOrderValue: number; // средний чек команды
    conversionRate: number; // процент приглашенных, сделавших заказы
  }>;
};

export async function getReferrals(days: number): Promise<ReferralsKpis> {
  const d = Math.max(1, Math.min(90, Number(days || 30)));

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - (d - 1));
  from.setHours(0, 0, 0, 0);

  // 1) invited count (all-time, because structure is all-time; still useful)
  const users = await prisma.user.findMany({
    select: { id: true, phone: true, referralCode: true },
  });
  const invited = await prisma.user.findMany({
    where: { referredByUserId: { not: null } },
    select: { id: true, referredByUserId: true },
  });

  const invitedCountByInviter = new Map<number, number>();
  for (const u of invited) {
    const inviterId = u.referredByUserId!;
    invitedCountByInviter.set(inviterId, (invitedCountByInviter.get(inviterId) || 0) + 1);
  }

  const invitedTop = users
    .map((u) => ({
      userId: u.id,
      phone: u.phone,
      referralCode: u.referralCode,
      invitedCount: invitedCountByInviter.get(u.id) || 0,
    }))
    .filter((x) => x.invitedCount > 0)
    .sort((a, b) => b.invitedCount - a.invitedCount)
    .slice(0, 20);

  // 2) team revenue (level 1) for period
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: from },
      status: { not: 'CANCELLED' },
      userId: { not: null },
    },
    select: { id: true, userId: true, totalAmount: true },
  });

  const inviterByUser = new Map<number, number>();
  for (const u of invited) {
    inviterByUser.set(u.id, u.referredByUserId!);
  }

  const teamRevenue = new Map<number, number>();
  const teamOrders = new Map<number, number>();
  for (const o of orders) {
    const buyerId = o.userId!;
    const inviterId = inviterByUser.get(buyerId);
    if (!inviterId) continue;
    teamRevenue.set(inviterId, (teamRevenue.get(inviterId) || 0) + o.totalAmount);
    teamOrders.set(inviterId, (teamOrders.get(inviterId) || 0) + 1);
  }

  const teamRevenueTop = users
    .map((u) => ({
      userId: u.id,
      phone: u.phone,
      referralCode: u.referralCode,
      teamOrders: teamOrders.get(u.id) || 0,
      teamRevenue: teamRevenue.get(u.id) || 0,
    }))
    .filter((x) => x.teamRevenue > 0)
    .sort((a, b) => b.teamRevenue - a.teamRevenue)
    .slice(0, 20);

  // 3) inviter bonus for period (ReferralEvent where referredUserId != null)
  const events = await prisma.referralEvent.findMany({
    where: {
      createdAt: { gte: from },
      type: 'ORDER_BONUS',
      referredUserId: { not: null },
    },
    select: { userId: true, amount: true },
  });

  const inviterBonus = new Map<number, number>();
  for (const e of events) {
    inviterBonus.set(e.userId, (inviterBonus.get(e.userId) || 0) + (e.amount || 0));
  }

  const inviterBonusTop = users
    .map((u) => ({
      userId: u.id,
      phone: u.phone,
      referralCode: u.referralCode,
      inviterBonus: inviterBonus.get(u.id) || 0,
    }))
    .filter((x) => x.inviterBonus > 0)
    .sort((a, b) => b.inviterBonus - a.inviterBonus)
    .slice(0, 20);

  // Расширенная аналитика для инфлюенсеров (только блоггеры с referralsEnabled = true)
  const allUsers = await prisma.user.findMany({
    where: { referralsEnabled: true },
    select: { 
      id: true, 
      phone: true, 
      name: true, 
      referralCode: true, 
      referralsEnabled: true 
    },
  });

  // Приглашенные за период
  const invitedInPeriod = await prisma.user.findMany({
    where: {
      referredByUserId: { not: null },
      createdAt: { gte: from },
    },
    select: { id: true, referredByUserId: true },
  });

  const invitedInPeriodByInviter = new Map<number, number>();
  for (const u of invitedInPeriod) {
    const inviterId = u.referredByUserId!;
    invitedInPeriodByInviter.set(inviterId, (invitedInPeriodByInviter.get(inviterId) || 0) + 1);
  }

  // Всего заработано бонусов (все время)
  const allTimeBonusEvents = await prisma.referralEvent.findMany({
    where: {
      type: 'ORDER_BONUS',
      referredUserId: { not: null },
    },
    select: { userId: true, amount: true },
  });

  const totalBonusEarned = new Map<number, number>();
  for (const e of allTimeBonusEvents) {
    totalBonusEarned.set(e.userId, (totalBonusEarned.get(e.userId) || 0) + (e.amount || 0));
  }

  const influencersDetailed = allUsers.map((u) => {
    const revenue = teamRevenue.get(u.id) || 0;
    const orders = teamOrders.get(u.id) || 0;
    const bonus = inviterBonus.get(u.id) || 0;
    const invited = invitedCountByInviter.get(u.id) || 0;
    const invitedPeriod = invitedInPeriodByInviter.get(u.id) || 0;
    const totalBonus = totalBonusEarned.get(u.id) || 0;

    return {
      userId: u.id,
      phone: u.phone || '',
      name: u.name,
      referralCode: u.referralCode,
      referralsEnabled: Boolean(u.referralsEnabled),
      invitedCount: invited,
      invitedInPeriod: invitedPeriod,
      teamRevenue: revenue,
      teamOrders: orders,
      inviterBonus: bonus,
      totalBonusEarned: totalBonus,
      avgOrderValue: orders > 0 ? Math.round(revenue / orders) : 0,
      conversionRate: invited > 0 ? Math.round((orders / invited) * 100) : 0,
    };
  })
  .filter((x) => x.invitedCount > 0 || x.teamRevenue > 0 || x.inviterBonus > 0)
  .sort((a, b) => b.teamRevenue - a.teamRevenue);

  return {
    days: d,
    from: from.toISOString(),
    to: now.toISOString(),
    invitedTop,
    teamRevenueTop,
    inviterBonusTop,
    influencersDetailed,
  };
}







