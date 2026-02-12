import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"

function asStr(v: unknown) {
  return typeof v === "string" ? v : ""
}

export async function POST(req: Request) {
  try {
    const c = await cookies();
    const userIdRaw = c.get("sb_userId")?.value;
    const userId = userIdRaw ? Number(userIdRaw) : null;
    // ✅ РАЗРЕШАЕМ ГОСТЕВОЙ ЧЕКАУТ: userId может быть null

    const body = await req.json().catch(() => ({}))
    const customerName = String(body?.customerName ?? "").trim()
    const customerPhone = String(body?.customerPhone ?? "").trim()
    const customerAddress = String(body?.customerAddress ?? "").trim()
    const comment = body?.comment ? String(body.comment).trim() : null
    const deliveryTimeRaw = body?.deliveryTime
    const deliveryTime = deliveryTimeRaw && typeof deliveryTimeRaw === 'string' && deliveryTimeRaw.trim() 
      ? deliveryTimeRaw.trim() 
      : null
    const itemsIn = Array.isArray(body?.items) ? body.items : []
    const bonusToSpend = Number(body?.bonusToSpend ?? 0) || 0
    const refCode = body?.ref ? String(body.ref).trim() : null // реферальный код из URL

    if (!customerName || !customerPhone || !customerAddress) {
      return NextResponse.json({ error: "Заполни имя, телефон и адрес." }, { status: 400 })
    }
    if (!itemsIn.length) {
      return NextResponse.json({ error: "Корзина пуста." }, { status: 400 })
    }

    const ids = itemsIn
      .map((x: any) => Number(x?.id))
      .filter((x: any) => Number.isInteger(x) && x > 0)
    if (!ids.length) {
      return NextResponse.json({ error: "Некорректные товары." }, { status: 400 })
    }

    const products = await prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true, price: true, oldPrice: true, name: true },
    })
    const byId = new Map<number, any>(products.map((p) => [p.id, p]))

    const rows: Array<{ productId: number; quantity: number; priceAtMoment: number; subtotal: number }> = []
    let totalAmount = 0

    for (const it of itemsIn) {
      const pid = Number(it?.id)
      const qty = Math.max(1, Number(it?.qty ?? 1))
      if (!Number.isInteger(pid) || pid <= 0) continue
      const p = byId.get(pid)
      if (!p) continue
      const priceAtMoment = Number(p.price ?? 0)
      const quantity = Math.max(1, Math.floor(qty))
      const subtotal = priceAtMoment * quantity
      rows.push({ productId: pid, quantity, priceAtMoment, subtotal })
      totalAmount += subtotal
    }

    if (!rows.length) {
      return NextResponse.json({ error: "Товары не найдены/неактивны." }, { status: 400 })
    }

    // Проверка суммы бонусов: не больше суммы заказа и не больше доступных бонусов
    if (bonusToSpend < 0) {
      return NextResponse.json(
        { ok: false, error: "Сумма бонусов не может быть отрицательной" },
        { status: 400 }
      );
    }
    if (bonusToSpend > totalAmount) {
      return NextResponse.json(
        { ok: false, error: "Нельзя списать бонусов больше суммы заказа" },
        { status: 400 }
      );
    }

    // Нормализуем телефон для поиска/создания пользователя
    const phoneNormalized = customerPhone.trim().replace(/\D/g, ""); // убираем все нецифровые символы

    const result = await prisma.$transaction(async (tx) => {
      let finalUserId = userId;
      let user = userId ? await tx.user.findUnique({ where: { id: userId } }) : null;

      // Если пользователь не авторизован, ищем по телефону или создаём нового
      if (!user && phoneNormalized) {
        // Ищем существующего пользователя по телефону
        user = await tx.user.findFirst({ 
          where: { 
            OR: [
              { phone: phoneNormalized },
              { phone: customerPhone.trim() },
            ]
          } 
        });

        if (user) {
          finalUserId = user.id;
          // Если пользователь найден, но у него нет данных - обновляем их
          const needsUpdate = (!user.name || !user.name.trim()) || (!user.address || !user.address.trim());
          if (needsUpdate) {
            const updateData: any = {};
            if (!user.name || !user.name.trim()) {
              updateData.name = customerName.trim() || null;
            }
            if (!user.address || !user.address.trim()) {
              updateData.address = customerAddress.trim() || null;
            }
            if (Object.keys(updateData).length > 0) {
              user = await tx.user.update({
                where: { id: user.id },
                data: updateData,
              });
              console.log(`[GUEST CHECKOUT] Updated existing user ${user.id} with missing data:`, updateData);
            }
          }
        } else {
          // Создаём нового пользователя автоматически
          // Находим реферера по коду, если указан
          let referredByUserId: number | null = null;
          if (refCode) {
            const referrer = await tx.user.findUnique({
              where: { referralCode: refCode },
              select: { id: true },
            });
            if (referrer) {
              referredByUserId = referrer.id;
            }
          }

          // Генерируем уникальный referralCode
          const last = await tx.user.findFirst({
            orderBy: { id: "desc" },
            select: { id: true },
          });
          const nextNum = (last?.id ?? 0) + 1000;
          const referralCode = `SAY${nextNum}`;

          // Создаём пользователя без пароля (пароль можно добавить позже через OTP)
          user = await tx.user.create({
            data: {
              login: phoneNormalized, // телефон как логин
              phone: phoneNormalized,
              name: customerName.trim() || null,
              address: customerAddress.trim() || null,
              role: "CUSTOMER",
              referralCode,
              bonusBalance: 0,
              slotsTotal: 1,
              passwordHash: null, // без пароля, вход только по OTP
              referredByUserId,
            } as any,
          });

          finalUserId = user.id;
          console.log(`[GUEST CHECKOUT] Created new user ${finalUserId} for phone ${phoneNormalized}`, {
            name: customerName.trim() || null,
            phone: phoneNormalized,
            address: customerAddress.trim() || null,
          });
        }
      }

      if (!user) {
        return { ok: false as const, error: "Не удалось создать или найти пользователя" };
      }

      // Проверяем бонусы только если пользователь авторизован и есть бонусы
      if (bonusToSpend > 0) {
        if (user.bonusBalance < bonusToSpend) {
          return { ok: false as const, error: "Недостаточно бонусов" };
        }

        // списываем бонусы
        await tx.user.update({
          where: { id: finalUserId },
          data: { bonusBalance: { decrement: bonusToSpend } },
        });

        await tx.referralEvent.create({
          data: {
            userId: finalUserId,
            referredUserId: null,
            orderId: null,
            type: "BONUS_SPENT",
            amount: -bonusToSpend,
            note: "Оплата заказа бонусами",
          },
        });
      }

      // Рассчитываем сумму, оплаченную наличными/картой
      const cashPaid = Math.max(0, totalAmount - bonusToSpend);

      const orderData: any = {
        userId: finalUserId,
        customerName: customerName,
        customerPhone: customerPhone,
        customerAddress: customerAddress,
        comment: comment || null,
        totalAmount: totalAmount,
        bonusSpent: bonusToSpend,
        cashPaid: cashPaid,
        status: "NEW",
        items: {
          create: rows.map((r) => ({
            productId: r.productId,
            quantity: r.quantity,
            priceAtMoment: r.priceAtMoment,
            subtotal: r.subtotal,
          })),
        },
      };

      // Добавляем deliveryTime только если оно указано
      if (deliveryTime) {
        orderData.deliveryTime = deliveryTime;
      }

      console.log("Creating order with data:", {
        userId: finalUserId,
        customerName,
        customerPhone,
        customerAddress,
        comment,
        deliveryTime,
        totalAmount,
        bonusToSpend,
        itemsCount: rows.length,
        isGuest: !userId,
      });

      const order = await tx.order.create({
        data: orderData,
        select: { id: true, customerPhone: true },
      });

      return { ok: true as const, orderId: order.id, userId: finalUserId, isNewUser: !userId && !user, customerPhone: order.customerPhone };
    });

    if (!result.ok) return NextResponse.json(result, { status: 400 });

    // Отправляем уведомление о создании заказа (не блокируем ответ, если WhatsApp упал)
    if (result.ok) {
      try {
        const { notifyOrderCreated } = await import("@/lib/notifications");
        await notifyOrderCreated({
          id: result.orderId,
          customerPhone: result.customerPhone || customerPhone,
        });
      } catch (notifyError) {
        // Логируем ошибку, но не ломаем создание заказа
        console.error("[ORDERS] Failed to send order created notification:", notifyError);
      }
    }

    // Обновляем контактные данные в профиле
    // ВСЕГДА сохраняем данные из формы заказа в профиль, чтобы при следующем заказе они уже были заполнены
    if (result.userId) {
      try {
        const updateData: any = {};
        
        // Всегда обновляем данные из формы заказа
        if (typeof customerName === "string" && customerName.trim()) {
          updateData.name = customerName.trim();
        }
        if (typeof customerPhone === "string" && customerPhone.trim()) {
          // Нормализуем телефон
          const phoneNormalized = customerPhone.trim().replace(/\D/g, "");
          if (phoneNormalized) {
            updateData.phone = phoneNormalized;
          }
        }
        if (typeof customerAddress === "string" && customerAddress.trim()) {
          updateData.address = customerAddress.trim();
        }
        
        if (Object.keys(updateData).length > 0) {
          await prisma.user.update({
            where: { id: result.userId },
            data: updateData,
          });
          console.log("Profile updated after order with form data:", { userId: result.userId, updateData });
        }
      } catch (e) {
        console.error("Failed to update user profile after order:", e);
      }
    }

    // ВАЖНО: бонусы за заказ НЕ начисляем здесь.
    // Начисление будет происходить только когда админ поставит статус DONE
    // в POST /api/orders/status.

    return NextResponse.json({ 
      ok: true, 
      id: result.orderId, 
      orderId: result.orderId,
      userId: result.userId,
      isNewUser: result.isNewUser, // флаг, что пользователь был создан автоматически
    })
  } catch (e: any) {
    console.error("API /orders POST error:", e)
    console.error("Error stack:", e?.stack)
    console.error("Error message:", e?.message)
    return NextResponse.json({ 
      error: "Внутренняя ошибка сервера",
      details: process.env.NODE_ENV === 'development' ? String(e?.message || e) : undefined
    }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const c = await cookies();
    const userIdFromCookie = c.get("sb_userId")?.value;
    const roleFromCookie = c.get("sb_role")?.value;
    const currentUserId = userIdFromCookie ? Number(userIdFromCookie) : null;
    
    if (!currentUserId || !Number.isFinite(currentUserId)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const userIdRaw = (url.searchParams.get("userId") ?? "").trim();
    const requestedUserId = userIdRaw ? Number(userIdRaw) : null;
    
    // Пользователь может видеть только свои заказы, админ - любые
    const isAdmin = roleFromCookie === "ADMIN";
    const userId = isAdmin && requestedUserId && Number.isFinite(requestedUserId) 
      ? requestedUserId 
      : currentUserId;

    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { product: true } },
      },
    });

    return NextResponse.json({ ok: true, orders });
  } catch (e) {
    console.error("GET /api/orders error", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
