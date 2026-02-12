import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idStr } = await ctx.params;
    const userId = Number(idStr);
    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { slotsTotal: true },
    });
    if (!user)
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 },
      );

    const children = await prisma.user.findMany({
      where: { placementParentId: userId },
      select: { id: true, phone: true, name: true, placementSlot: true },
    });

    const map = new Map<number, any>();
    for (const c of children) {
      if (c.placementSlot) map.set(c.placementSlot, c);
    }

    const slots = Array.from({ length: user.slotsTotal }, (_, i) => {
      const slot = i + 1;
      const occ = map.get(slot);
      return occ
        ? {
            slot,
            occupied: true,
            user: { id: occ.id, phone: occ.phone, name: occ.name },
          }
        : { slot, occupied: false };
    });

    return NextResponse.json({
      ok: true,
      slotsTotal: user.slotsTotal,
      slots,
    });
  } catch (e) {
    console.error('layout error', e);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }
}






