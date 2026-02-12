import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idStr } = await ctx.params;
    const userId = Number(idStr);

    const body = await req.json().catch(() => null);
    const { action } = (body || {}) as { action?: 'INC' | 'DEC' };

    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });
    }
    if (action !== 'INC' && action !== 'DEC') {
      return NextResponse.json(
        { error: 'action должен быть INC или DEC' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, slotsTotal: true },
    });
    if (!user)
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 },
      );

    if (action === 'DEC') {
      const lastSlot = user.slotsTotal;
      const occupied = await prisma.user.findFirst({
        where: { placementParentId: userId, placementSlot: lastSlot },
        select: { id: true },
      });
      if (occupied) {
        return NextResponse.json(
          { error: 'Нельзя удалить слот: последний слот занят' },
          { status: 400 },
        );
      }
      if (user.slotsTotal <= 1) {
        return NextResponse.json({ error: 'Минимум 1 слот' }, { status: 400 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { slotsTotal: action === 'INC' ? { increment: 1 } : { decrement: 1 } },
      select: { id: true, slotsTotal: true },
    });

    return NextResponse.json({ ok: true, user: updated });
  } catch (e) {
    console.error('slotsTotal error', e);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }
}






