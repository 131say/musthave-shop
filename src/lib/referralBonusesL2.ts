import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

/**
 * Двухуровневая система реферальных бонусов:
 * - L1 = прямой реферер покупателя (родитель)
 * - L2 = реферер реферера (дедушка/бабушка)
 *
 * Бонусы начисляются ТОЛЬКО от cashPaid (сумма, оплаченная деньгами)
 * Для более надежной системы используем ReferralType.LEVEL_BONUS для уровня 2
 */

export type L2BonusResult = {
  awarded: boolean;
  l2UserId: number | null;
  l2Phone: string | null;
  bonusAmount: number;
};

export async function awardReferralBonusesL2(params: {
  orderId: number;
  buyerId: number;
  cashPaid: number; // сумма, оплаченная деньгами (не бонусами)
}): Promise<L2BonusResult> {
  const { orderId, buyerId, cashPaid } = params;

  if (!cashPaid || cashPaid <= 0) {
    // Если нет оплаты наличными - бонусы не начисляем
    return { awarded: false, l2UserId: null, l2Phone: null, bonusAmount: 0 };
  }

  // ✅ ИДЕМПОТЕНТНОСТЬ: проверяем, не начисляли ли уже L2 бонусы за этот заказ
  const alreadyAwarded = await prisma.referralEvent.findFirst({
    where: {
      orderId,
      type: "LEVEL_BONUS",
    },
    select: { id: true },
  });

  if (alreadyAwarded) {
    // L2 бонусы уже начислены — выходим
    return { awarded: false, l2UserId: null, l2Phone: null, bonusAmount: 0 };
  }

  const settings = await getSettings().catch(() => ({
    inviterPercent: 5,
    inviterBonusLevel2Percent: 1, // Уровень 2: 1%
  }));

  const l2Percent = Number(settings.inviterBonusLevel2Percent ?? 0) / 100;

  if (l2Percent <= 0) {
    // Если процент нулевой - ничего не делаем
    return { awarded: false, l2UserId: null, l2Phone: null, bonusAmount: 0 };
  }

  // Загружаем цепочку: buyer -> L1 -> L2
  const buyer = await prisma.user.findUnique({
    where: { id: buyerId },
    select: { id: true, referredByUserId: true },
  });

  if (!buyer?.referredByUserId) {
    // Если нет реферера - не начисляем бонусы
    return { awarded: false, l2UserId: null, l2Phone: null, bonusAmount: 0 };
  }

  const l1Id = buyer.referredByUserId;
  const l1 = await prisma.user.findUnique({
    where: { id: l1Id },
    select: { id: true, referredByUserId: true },
  });

  if (!l1?.id) {
    // Реферер не найден
    return { awarded: false, l2UserId: null, l2Phone: null, bonusAmount: 0 };
  }

  // Загружаем L2 (если есть)
  const l2Id = l1.referredByUserId;
  const l2 = l2Id
    ? await prisma.user.findUnique({
        where: { id: l2Id },
        select: { id: true, referralsEnabled: true, phone: true },
      })
    : null;

  // Защита от циклов и самовыплат
  const seen = new Set<number>([buyerId]);

  // ❌ УДАЛЕНО: L1 начисляется уже в основной логике /api/orders/status
  // Здесь начисляем ТОЛЬКО L2 бонусы

  // Начисляем L2 бонус (реферер первого реферера)
  // ВАЖНО: начисляем ТОЛЬКО если у L2 открыт 2 уровень (referralsEnabled === true)
  if (l2?.id && l2.id !== buyerId && l2.id !== l1.id && l2Percent > 0) {
    // Бонусы за 2 уровень начисляются ТОЛЬКО если уровень открыт
    if (!l2.referralsEnabled) {
      return { awarded: false, l2UserId: null, l2Phone: null, bonusAmount: 0 }; // 2 уровень закрыт - бонусы не начисляем
    }

    const amount = Math.round(cashPaid * l2Percent);
    if (amount > 0) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: l2.id },
          data: { bonusBalance: { increment: amount } },
        }),
        prisma.referralEvent.create({
          data: {
            userId: l2.id,
            referredUserId: l1.id, // указываем, что это через L1
            orderId,
            type: "LEVEL_BONUS",
            amount,
            note: `Бонус 2-го уровня (команда) за заказ #${orderId} (реф.цепь: ${buyerId} -> ${l1.id} -> ${l2.id})`,
          },
        }),
      ]);

      return {
        awarded: true,
        l2UserId: l2.id,
        l2Phone: l2.phone || null,
        bonusAmount: amount,
      };
    }
  }

  return { awarded: false, l2UserId: null, l2Phone: null, bonusAmount: 0 };
}
