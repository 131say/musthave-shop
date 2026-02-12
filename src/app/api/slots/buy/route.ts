export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextSlotPriceForUser } from "@/lib/slots";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.phone) return NextResponse.json({ error: "phone required" }, { status: 400 });
    const phone = String(body.phone).trim();
    if (!phone) return NextResponse.json({ error: "phone required" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { phone } });
      if (!user) return { ok: false as const, status: 404 as const, error: "User not found" };
      if (user.role !== "CUSTOMER" && user.role !== "ADMIN") {
        return { ok: false as const, status: 403 as const, error: "Forbidden" };
      }
      
      // Проверяем, не является ли пользователь блоггером (с включенной реферальной программой)
      if ((user as any).referralsEnabled === true) {
        return { ok: false as const, status: 403 as const, error: "Для блоггеров система слотов отключена" };
      }

      const { nextSlotNumber, price } = await getNextSlotPriceForUser(user.slotsTotal);
      if (price <= 0) {
        return { ok: false as const, status: 400 as const, error: "Invalid slot price" };
      }

      if ((user.bonusBalance ?? 0) < price) {
        return {
          ok: false as const,
          status: 400 as const,
          error: "Недостаточно бонусов",
          need: price,
          have: user.bonusBalance ?? 0,
          nextSlotNumber,
        };
      }

      const updated = await tx.user.update({
        where: { id: user.id },
        data: {
          bonusBalance: { decrement: price },
          slotsTotal: { increment: 1 },
        },
      });

      await tx.referralEvent.create({
        data: {
          userId: user.id,
          type: "BONUS_SPENT",
          amount: -price,
          note: `SLOT_UNLOCK slot=${nextSlotNumber}`,
        },
      });

      return {
        ok: true as const,
        user: { id: updated.id, phone: updated.phone, bonusBalance: updated.bonusBalance, slotsTotal: updated.slotsTotal },
        spent: price,
        nextSlotNumber,
      };
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: (result as any).status ?? 400 });
    }
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("slots/buy error", e);
    return NextResponse.json(
      {
        error: "Внутренняя ошибка сервера",
        details: process.env.NODE_ENV !== "production" ? (e?.message || String(e)) : undefined,
      },
      { status: 500 }
    );
  }
}







