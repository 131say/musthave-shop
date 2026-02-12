import { prisma } from "@/lib/prisma";

export type Settings = {
  customerPercent: number; // %
  inviterPercent: number; // % - L1 реферер
  inviterBonusLevel2Percent: number; // % - L2 реферер
  allowFullBonusPay: boolean;
  reservePercent: number;
  slotBaseBonus: number;
  slotStepBonus: number;
  // Промо-блок
  promoTitle?: string | null;
  promoDescription?: string | null;
  promoTags?: string | null; // JSON массив
  promoImageUrl?: string | null;
};

export async function getSettings(): Promise<Settings> {
  const row = await prisma.appSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return {
    customerPercent: row.customerPercent,
    inviterPercent: row.inviterPercent,
    inviterBonusLevel2Percent: row.inviterBonusLevel2Percent ?? 2,
    allowFullBonusPay: row.allowFullBonusPay,
    reservePercent: row.reservePercent ?? 30,
    slotBaseBonus: row.slotBaseBonus ?? 1000,
    slotStepBonus: row.slotStepBonus ?? 500,
    promoTitle: row.promoTitle ?? null,
    promoDescription: row.promoDescription ?? null,
    promoTags: row.promoTags ?? null,
    promoImageUrl: row.promoImageUrl ?? null,
  };
}






