import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { awardReferralBonusesL2 } from '@/lib/referralBonusesL2';

type Status = "NEW" | "PROCESSING" | "PAID" | "SHIPPED" | "DONE" | "CANCELLED";

async function isAdmin() {
  const c = await cookies();
  const roleCookie = (c.get("sb_role")?.value ?? "").trim().toUpperCase();
  const userIdCookie = Number((c.get("sb_userId")?.value ?? "").trim());
  if (roleCookie === "ADMIN") return true;
  if (!userIdCookie || !Number.isFinite(userIdCookie)) return false;
  const u = await prisma.user.findUnique({ where: { id: userIdCookie } }).catch(() => null);
  return String((u as any)?.role ?? "").trim().toUpperCase() === "ADMIN";
}

export async function POST(req: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const orderId = Number(body?.orderId);
    const status = body?.status as Status | undefined;

    if (!orderId || !status) {
      return NextResponse.json({ ok: false, error: "orderId/status required" }, { status: 400 });
    }

    // Валидация статуса
    const validStatuses: Status[] = ["NEW", "PROCESSING", "PAID", "SHIPPED", "DONE", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ ok: false, error: `Invalid status: ${status}` }, { status: 400 });
    }

    const settings = await getSettings().catch(() => ({ 
      inviterPercent: 5,      // Уровень 1 (прямые рефералы): 5%
      customerPercent: 7,     // Уровень 0 (собственная покупка): 7%
      inviterBonusLevel2Percent: 1, // Уровень 2 (команда): 1%
    }));
    const INVITER_PERCENT = (settings as any).inviterPercent / 100;
    const CUSTOMER_PERCENT = (settings as any).customerPercent / 100;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { 
          user: {
            include: { referredBy: true },
          },
          referralEvents: true,
        },
      });
      if (!order) return { ok: false as const, error: "Order not found" };

      const prev = order.status;

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status },
      });

      // Бонусы начисляем только при переходе в DONE
      let customerBonus: number | null = null;
      let inviterBonus: number | null = null;
      let inviterPhone: string | null = null;
      let referredUserName: string | null = null;

      if (status === "DONE" && prev !== "DONE") {
        // защита от дубля (если уже начисляли)
        const already = await tx.referralEvent.findFirst({
          where: { orderId, type: "ORDER_BONUS" },
        });

        if (!already && order.userId && order.user) {
          // Бонусы начисляем только от суммы, оплаченной наличными/картой (не бонусами)
          const cashPaid = order.cashPaid || 0;
          customerBonus = Math.round(cashPaid * CUSTOMER_PERCENT);
          const inviterId = order.user.referredByUserId ?? null;
          inviterBonus = inviterId ? Math.round(cashPaid * INVITER_PERCENT) : 0;

          if (customerBonus > 0) {
            await tx.user.update({
              where: { id: order.userId },
              data: { bonusBalance: { increment: customerBonus } },
            });
            await tx.referralEvent.create({
              data: {
                userId: order.userId,
                referredUserId: null,
                orderId,
                type: "ORDER_BONUS",
                amount: customerBonus,
                note: "Бонус 0-го уровня (собственная покупка) за выполненный заказ (DONE)",
              },
            });
          }

          if (inviterId && inviterBonus > 0) {
            // Получаем данные реферера для уведомления
            const inviter = await tx.user.findUnique({
              where: { id: inviterId },
              select: { phone: true, name: true },
            });

            await tx.user.update({
              where: { id: inviterId },
              data: { bonusBalance: { increment: inviterBonus } },
            });
            await tx.referralEvent.create({
              data: {
                userId: inviterId,
                referredUserId: order.userId,
                orderId,
                type: "ORDER_BONUS",
                amount: inviterBonus,
                note: "Бонус 1-го уровня (прямой реферал) за выполненный заказ (DONE)",
              },
            });

            // Сохраняем данные для уведомления после транзакции
            inviterPhone = inviter?.phone || null;
            referredUserName = order.user.name || null;

            // Проверяем и открываем 2 уровень у реферера, если условие выполнено
            // (делаем это после начисления бонуса, чтобы не блокировать транзакцию)
            // Сохраняем inviterId для проверки после транзакции
            // (проверка будет выполнена после commit транзакции)
          }
        }
      }

      // При отмене заказа возвращаем списанные бонусы (если они были и ещё не возвращены)
      // Защита: возвращаем только если был userId (заказ создавался с пользователем)
      if (status === "CANCELLED" && order.bonusSpent > 0 && !order.bonusRefunded && order.userId) {
        // Возвращаем списанные бонусы пользователю
        await tx.user.update({
          where: { id: order.userId },
          data: { bonusBalance: { increment: order.bonusSpent } },
        });

        // Создаем событие о возврате списанных бонусов
        await tx.referralEvent.create({
          data: {
            userId: order.userId,
            referredUserId: null,
            orderId,
            type: "BONUS_SPENT_REFUND",
            amount: order.bonusSpent,
            note: `Возврат списанных бонусов при отмене заказа (заказ #${orderId})`,
          },
        });

        // Помечаем, что бонусы возвращены (защита от двойного возврата)
        await tx.order.update({
          where: { id: orderId },
          data: { bonusRefunded: true },
        });
      }

      // При отмене выполненного заказа списываем начисленные бонусы
      if (status === "CANCELLED" && prev === "DONE") {
        // Находим все события ORDER_BONUS для этого заказа
        const orderBonusEvents = await tx.referralEvent.findMany({
          where: {
            orderId,
            type: "ORDER_BONUS",
          },
        });

        for (const event of orderBonusEvents) {
          // Списываем бонусы у пользователя
          await tx.user.update({
            where: { id: event.userId },
            data: { bonusBalance: { decrement: event.amount } },
          });

          // Создаем событие о списании
          await tx.referralEvent.create({
            data: {
              userId: event.userId,
              referredUserId: event.referredUserId,
              orderId,
              type: "MANUAL_ADJUSTMENT",
              amount: -event.amount,
              note: `Списание бонусов за отмену выполненного заказа (заказ #${orderId})`,
            },
          });
        }
      }

      return { 
        ok: true as const, 
        order: updated, 
        prevStatus: prev, 
        customerPhone: order.customerPhone,
        customerBonus: customerBonus || null,
        inviterBonus: inviterBonus || null,
        inviterPhone: inviterPhone || null,
        referredUserName: referredUserName || null,
      };
    });

    // Отправляем уведомление о подтверждении оплаты (не блокируем ответ, если WhatsApp упал)
    if (result.ok && status === "PAID" && result.prevStatus !== "PAID") {
      try {
        const { notifyOrderPaid } = await import("@/lib/notifications");
        await notifyOrderPaid({
          id: orderId,
          customerPhone: result.customerPhone,
        });
      } catch (notifyError) {
        // Логируем ошибку, но не ломаем обновление статуса
        console.error("[ORDERS STATUS] Failed to send order paid notification:", notifyError);
      }
    }

    // После завершения транзакции: начисляем двухуровневые бонусы и проверяем открытие 2 уровня
    if (result.ok && status === "DONE") {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { userId: true, cashPaid: true },
      });
      let l2BonusResult: { awarded: boolean; l2UserId: number | null; l2Phone: string | null; bonusAmount: number } | null = null;
      if (order?.userId && order.cashPaid) {
        try {
          l2BonusResult = await awardReferralBonusesL2({
            orderId,
            buyerId: order.userId,
            cashPaid: order.cashPaid,
          });
        } catch (e) {
          console.error("Error awarding L2 referral bonuses:", e);
          // Не прерываем обновление статуса из-за ошибки L2 бонусов
        }
      }

      // Проверяем и открываем 2 уровень у реферера L1, если условие выполнено
      // (делаем это после транзакции, чтобы не блокировать основную логику)
      if (result.inviterBonus && result.inviterBonus > 0) {
        // Находим ID реферера из заказа
        const orderWithUser = await prisma.order.findUnique({
          where: { id: orderId },
          select: { user: { select: { referredByUserId: true } } },
        });
        
        if (orderWithUser?.user?.referredByUserId) {
          try {
            const { unlockLevel2IfConditionMet } = await import("@/lib/referral-level2");
            await unlockLevel2IfConditionMet(orderWithUser.user.referredByUserId);
          } catch (e) {
            console.error(`[ORDERS STATUS] Failed to check level 2 unlock:`, e);
            // Не прерываем обновление статуса из-за ошибки проверки уровня
          }
        }
      }

      // Отправляем уведомления о начисленных бонусах (не блокируем ответ, если WhatsApp упал)
      if (result.ok) {
        try {
          const { notifyOrderBonus, notifyReferralBonus } = await import("@/lib/notifications");
          
          // Уведомление покупателю о бонусах за заказ (только если реально начислены)
          if (result.customerBonus && result.customerBonus > 0 && result.customerPhone) {
            await notifyOrderBonus(
              {
                id: orderId,
                customerPhone: result.customerPhone,
              },
              result.customerBonus
            );
          }

          // Уведомление рефереру о реферальных бонусах (только если реально начислены)
          if (result.inviterBonus && result.inviterBonus > 0 && result.inviterPhone) {
            await notifyReferralBonus(
              result.inviterPhone,
              result.inviterBonus,
              result.referredUserName || undefined
            );
          }

          // Уведомление L2 о бонусах за команду (только если реально начислены)
          if (l2BonusResult?.awarded && l2BonusResult.l2Phone && l2BonusResult.bonusAmount > 0) {
            const { notifyTeamBonus } = await import("@/lib/notifications");
            await notifyTeamBonus(
              l2BonusResult.l2Phone,
              l2BonusResult.bonusAmount,
              String(orderId)
            );
          }
        } catch (notifyError) {
          // Логируем ошибку, но не ломаем обновление статуса
          console.error("[ORDERS STATUS] Failed to send bonus notifications:", notifyError);
        }
      }
    }

    if (!result.ok) return NextResponse.json(result, { status: 404 });
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("POST /api/orders/status error", e);
    const errorMessage = e?.message || String(e) || "Server error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}






