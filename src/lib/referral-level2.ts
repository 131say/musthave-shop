/**
 * Логика открытия 2 уровня (команда) реферальной системы
 * 
 * Условие открытия: 3 активных реферала 1 уровня
 * "Активный" = сделал хотя бы 1 заказ со статусом DONE
 */

import { prisma } from "@/lib/prisma";

/**
 * Проверяет, выполнено ли условие для открытия 2 уровня
 * @param userId ID пользователя
 * @returns true если есть 3+ активных реферала L1
 */
export async function checkLevel2UnlockCondition(userId: number): Promise<boolean> {
  // Находим всех прямых рефералов (L1)
  const l1Referrals = await prisma.user.findMany({
    where: { referredByUserId: userId },
    select: { id: true },
  });

  if (l1Referrals.length < 3) {
    return false;
  }

  // Проверяем, сколько из них активны (сделали хотя бы 1 заказ со статусом DONE)
  const l1Ids = l1Referrals.map(u => u.id);
  
  const activeCount = await prisma.order.count({
    where: {
      userId: { in: l1Ids },
      status: "DONE",
    },
    distinct: ["userId"], // Уникальные пользователи
  });

  return activeCount >= 3;
}

/**
 * Проверяет и автоматически открывает 2 уровень, если условие выполнено
 * @param userId ID пользователя
 * @returns true если уровень был открыт (или уже был открыт), false если условие не выполнено
 */
export async function unlockLevel2IfConditionMet(userId: number): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, referralsEnabled: true, phone: true },
  });

  if (!user) {
    return false;
  }

  // Если уже открыт - ничего не делаем
  if (user.referralsEnabled) {
    return true;
  }

  // Проверяем условие
  const conditionMet = await checkLevel2UnlockCondition(userId);
  
  if (conditionMet) {
    // Открываем 2 уровень
    await prisma.user.update({
      where: { id: userId },
      data: { referralsEnabled: true },
    });
    
    // Отправляем уведомление об открытии 2 уровня (не блокируем, если WhatsApp упал)
    if (user.phone) {
      try {
        const { notifyLevel2Unlocked } = await import("@/lib/notifications");
        await notifyLevel2Unlocked(user.phone);
      } catch (notifyError) {
        console.error(`[REFERRAL LEVEL2] Failed to send level 2 unlocked notification to ${user.phone}:`, notifyError);
      }
    }
    
    return true;
  }

  return false;
}
