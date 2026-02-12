import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function normalizePhone(raw: string) {
  return raw.replace(/\s+/g, '');
}
function isValidPhone(p: string) {
  // MVP-валидация: + и 10..15 цифр
  const s = p.startsWith('+') ? p.slice(1) : p;
  return /^[0-9]{10,15}$/.test(s);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idStr } = await ctx.params;
    const parentId = Number(idStr);
    if (!parentId || Number.isNaN(parentId)) {
      return NextResponse.json({ error: 'Некорректный id' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const {
      slot,
      phone,
      name,
      inviterReferralCode, // опционально
    } = (body || {}) as {
      slot?: number;
      phone?: string;
      name?: string;
      inviterReferralCode?: string;
    };

    if (!slot || !phone) {
      return NextResponse.json(
        { error: 'slot и phone обязательны' },
        { status: 400 },
      );
    }

    const p = normalizePhone(phone);
    if (!isValidPhone(p)) {
      return NextResponse.json({ error: 'Некорректный телефон' }, { status: 400 });
    }

    const parent = await prisma.user.findUnique({
      where: { id: parentId },
      select: { id: true, slotsTotal: true },
    });
    if (!parent)
      return NextResponse.json({ error: 'Родитель не найден' }, { status: 404 });
    if (slot > parent.slotsTotal) {
      return NextResponse.json(
        { error: 'Слот заблокирован (недоступен)' },
        { status: 400 },
      );
    }

    // слот свободен?
    const existingInSlot = await prisma.user.findFirst({
      where: { placementParentId: parentId, placementSlot: slot },
      select: { id: true, phone: true },
    });
    if (existingInSlot) {
      return NextResponse.json({ error: 'Слот уже занят' }, { status: 400 });
    }

    // inviter (реферальный) опционально
    let referredByUserId: number | null = null;
    if (inviterReferralCode) {
      const inviter = await prisma.user.findUnique({
        where: { referralCode: inviterReferralCode.trim() },
        select: { id: true },
      });
      if (inviter) referredByUserId = inviter.id;
    }

    // CUSTOMER создаётся без пароля - вход только через OTP (WhatsApp)
    const role = 'CUSTOMER';
    const passwordHash = null; // CUSTOMER не имеет пароля

    // referralCode обязателен — у тебя уже есть генератор в orders/login, но тут сделаем простой:
    // SAY + lastId+1000 (через транзакцию безопаснее)
    const created = await prisma.$transaction(async (tx) => {
      const last = await tx.user.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true },
      });
      const nextNum = (last?.id ?? 0) + 1000;
      const referralCode = `SAY${nextNum}`;

      // Защита: CUSTOMER не должен иметь пароль
      if (role === 'CUSTOMER' && passwordHash !== null) {
        throw new Error('CUSTOMER users must not have passwordHash');
      }

      const user = await tx.user.create({
        data: {
          phone: p,
          name: name?.trim() || null,
          role,
          referralCode,
          bonusBalance: 0,
          referredByUserId,
          placementParentId: parentId,
          placementSlot: slot,
          passwordHash,
        },
      });

      return user;
    });

    return NextResponse.json({
      ok: true,
      user: { id: created.id, phone: created.phone },
    });
  } catch (e: any) {
    console.error('create-in-slot error', e);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }
}






