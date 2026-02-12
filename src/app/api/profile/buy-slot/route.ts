import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getNextSlotPriceForUser } from "@/lib/slots";

async function authedUserId() {
  const c = await cookies();
  const v = c.get("sb_userId")?.value ?? "";
  const id = Number(v);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function POST() {
  try {
    const userId = await authedUserId();
    if (!userId) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    // Получаем настройки ДО транзакции, чтобы избежать конфликтов блокировок в SQLite
    const userBeforeTx = await prisma.user.findUnique({
      where: { id: userId },
      select: { slotsTotal: true, bonusBalance: true, referralsEnabled: true },
    });
    if (!userBeforeTx) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    
    // Проверяем, не является ли пользователь блоггером (с включенной реферальной программой)
    if ((userBeforeTx as any).referralsEnabled === true) {
      return NextResponse.json({ ok: false, error: "Для блоггеров система слотов отключена" }, { status: 403 });
    }

    const slotsTotal = (userBeforeTx as any).slotsTotal ?? 1;
    const slotInfo = await getNextSlotPriceForUser(slotsTotal);
    const price = slotInfo.price;
    const nextSlotIndex = slotInfo.nextSlotNumber;

    if (price <= 0) return NextResponse.json({ ok: false, error: "Нельзя купить этот слот" }, { status: 400 });
    if ((userBeforeTx.bonusBalance ?? 0) < price) {
      return NextResponse.json({ ok: false, error: "Недостаточно бонусов для покупки слота" }, { status: 400 });
    }

    const out = await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { id: userId } });
      if (!u) return { ok: false as const, error: "Not found" };
      
      // Повторная проверка баланса внутри транзакции для безопасности
      if ((u.bonusBalance ?? 0) < price) return { ok: false as const, error: "Недостаточно бонусов для покупки слота" };

      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          bonusBalance: { decrement: price },
          slotsTotal: { increment: 1 },
        },
        select: { bonusBalance: true, slotsTotal: true, slotsUsed: true },
      });

      await tx.referralEvent.create({
        data: {
          userId,
          referredUserId: null,
          orderId: null,
          type: "BONUS_SPENT",
          amount: -price,
          note: `Покупка слота #${nextSlotIndex}`,
        },
      });

      return { ok: true as const, profile: updated, slotPrice: price, slotIndex: nextSlotIndex };
    });

    if (!out.ok) return NextResponse.json(out, { status: 400 });
    return NextResponse.json(out);
  } catch (e) {
    console.error("POST /api/profile/buy-slot", e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

