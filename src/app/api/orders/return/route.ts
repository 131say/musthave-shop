import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

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
    const returns = body?.returns as Array<{ itemId: number; quantity: number }> | undefined;

    if (!orderId || !Array.isArray(returns) || !returns.length) {
      return NextResponse.json({ ok: false, error: "orderId and returns array required" }, { status: 400 });
    }

    const settings = await getSettings().catch(() => ({ inviterPercent: 3, customerPercent: 5 }));
    const INVITER_PERCENT = (settings as any).inviterPercent / 100;
    const CUSTOMER_PERCENT = (settings as any).customerPercent / 100;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: { product: true },
          },
          user: {
            include: { referredBy: true },
          },
          referralEvents: true,
        },
      });

      if (!order) return { ok: false as const, error: "Order not found" };
      if (!order.userId || !order.user) {
        return { ok: false as const, error: "Order has no user" };
      }

      // Сохраняем оригинальные значения заказа для правильных расчетов при повторных возвратах
      const originalTotalAmount = order.totalAmount;
      const originalBonusSpent = order.bonusSpent;

      // Проверяем, что возвращаемые количества не превышают доступные
      const itemMap = new Map(order.items.map((item) => [item.id, item]));
      let totalReturnAmount = 0;

      for (const ret of returns) {
        const item = itemMap.get(ret.itemId);
        if (!item) {
          return { ok: false as const, error: `Item ${ret.itemId} not found in order` };
        }
        const alreadyReturned = item.returnedQuantity || 0;
        const availableToReturn = item.quantity - alreadyReturned;
        if (ret.quantity > availableToReturn || ret.quantity <= 0) {
          return { ok: false as const, error: `Invalid return quantity for item ${ret.itemId}` };
        }

        // Рассчитываем сумму возврата для этого товара
        const returnSubtotal = Math.round((item.priceAtMoment * ret.quantity));
        totalReturnAmount += returnSubtotal;
      }

      // Обновляем returnedQuantity для каждого товара и считаем общее количество возвращенных
      let totalReturnedAfter = 0;
      const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

      for (const ret of returns) {
        const item = itemMap.get(ret.itemId);
        if (!item) continue;
        const currentReturned = item.returnedQuantity || 0;
        const newReturned = currentReturned + ret.quantity;
        await tx.orderItem.update({
          where: { id: ret.itemId },
          data: {
            returnedQuantity: newReturned,
          },
        });
        totalReturnedAfter += newReturned;
      }

      // Добавляем уже возвращенные товары, которые не были в текущем возврате
      for (const item of order.items) {
        if (!returns.find((r) => r.itemId === item.id)) {
          totalReturnedAfter += item.returnedQuantity || 0;
        }
      }

      // Проверяем, является ли возврат полным (все товары возвращены)
      const isFullReturn = totalReturnedAfter >= totalQuantity;

      // Пересчитываем общую сумму заказа
      const newTotalAmount = order.totalAmount - totalReturnAmount;
      // При частичном возврате бонусы остаются на оставшиеся товары
      // При полном возврате все бонусы возвращаются
      const newBonusSpent = isFullReturn ? 0 : order.bonusSpent;
      const newCashPaid = Math.max(0, newTotalAmount - newBonusSpent);

      await tx.order.update({
        where: { id: orderId },
        data: {
          totalAmount: newTotalAmount,
          bonusSpent: newBonusSpent,
          cashPaid: newCashPaid,
        },
      });

      // Бонусы возвращаются ТОЛЬКО при полном возврате заказа
      if (isFullReturn && originalBonusSpent > 0) {
        // Возвращаем ВСЕ потраченные бонусы
        await tx.user.update({
          where: { id: order.userId },
          data: { bonusBalance: { increment: originalBonusSpent } },
        });

        await tx.referralEvent.create({
          data: {
            userId: order.userId,
            referredUserId: null,
            orderId,
            type: "MANUAL_ADJUSTMENT",
            amount: originalBonusSpent,
            note: `Возврат всех бонусов при полном возврате заказа (заказ #${orderId})`,
          },
        });
      }

      // Кэшбэк списывается пропорционально возвращенным товарам
      const orderBonusEvents = order.referralEvents.filter(
        (e) => e.type === "ORDER_BONUS" && e.orderId === orderId
      );

      if (orderBonusEvents.length > 0 && originalTotalAmount > 0) {
        // Рассчитываем долю возврата от ОРИГИНАЛЬНОЙ суммы заказа
        const returnRatio = totalReturnAmount / originalTotalAmount;

        for (const event of orderBonusEvents) {
          // Рассчитываем, сколько кэшбэка нужно списать за возвращенные товары
          const cashbackToDeduct = Math.round(event.amount * returnRatio);
          
          if (cashbackToDeduct > 0) {
            await tx.user.update({
              where: { id: event.userId },
              data: { bonusBalance: { decrement: cashbackToDeduct } },
            });

            const note = isFullReturn 
              ? `Списание кэшбэка при полном возврате заказа (заказ #${orderId})`
              : `Списание кэшбэка за возвращенные товары (заказ #${orderId})`;

            await tx.referralEvent.create({
              data: {
                userId: event.userId,
                referredUserId: event.referredUserId,
                orderId,
                type: "MANUAL_ADJUSTMENT",
                amount: -cashbackToDeduct,
                note,
              },
            });
          }
        }
      }

      // Возвращаем деньги клиенту (если были оплачены наличными)
      // В реальной системе здесь должна быть логика возврата денег через платежную систему
      // Пока просто логируем

      return { ok: true as const, orderId, totalReturnAmount, isFullReturn };
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: result.error === "Order not found" ? 404 : 400 });
    }
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("POST /api/orders/return error", e);
    const errorMessage = e?.message || String(e) || "Server error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

