import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

type OrderStatus = "NEW" | "PROCESSING" | "DONE" | "CANCELLED";

export type ReserveStatus = {
  reservePercent: number;
  cashInAll: number;
  reserveNeeded: number;
  reservedCashAll: number;
  reserveGap: number;
  blocked: boolean;
};

export async function getReserveStatus(): Promise<ReserveStatus> {
  const s = await getSettings();
  const reservePercent = Number(s.reservePercent ?? 30);

  const cashAgg = await prisma.order.aggregate({
    where: {
      NOT: { status: "CANCELLED" as OrderStatus },
    },
    _sum: { cashPaid: true },
  });
  const cashInAll = Number(cashAgg._sum.cashPaid || 0);

  const usersAgg = await prisma.user.aggregate({
    _sum: { bonusBalance: true },
  });
  const reserveNeeded = Number(usersAgg._sum.bonusBalance || 0);

  const reservedCashAll = Math.round((cashInAll * reservePercent) / 100);
  const reserveGap = reservedCashAll - reserveNeeded;
  const blocked = reserveGap < 0;

  return {
    reservePercent,
    cashInAll,
    reserveNeeded,
    reservedCashAll,
    reserveGap,
    blocked,
  };
}






