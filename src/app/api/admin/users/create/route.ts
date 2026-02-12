import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

function normalizePhone(raw: string) {
  return raw.replace(/\s+/g, '');
}

function isValidPhone(p: string) {
  const s = p.startsWith('+') ? p.slice(1) : p;
  return /^[0-9]{10,15}$/.test(s);
}

export async function POST(req: Request) {
  // Проверка должна быть server-side, не только в UI
  const authCheck = await requireAdmin();
  if (authCheck) return authCheck;
  
  try {
    const body = await req.json().catch(() => null);
    const { phone, name } = (body || {}) as {
      phone?: string;
      name?: string;
    };

    if (!phone) {
      return NextResponse.json(
        { error: 'Телефон обязателен' },
        { status: 400 },
      );
    }

    const p = normalizePhone(phone);
    if (!isValidPhone(p)) {
      return NextResponse.json({ error: 'Некорректный телефон' }, { status: 400 });
    }

    const exists = await prisma.user.findFirst({
      where: { phone: p },
      select: { id: true },
    });
    if (exists) {
      return NextResponse.json(
        { error: 'Пользователь с таким телефоном уже существует' },
        { status: 400 },
      );
    }

    // CUSTOMER создаётся без пароля - вход только через OTP (WhatsApp)
    const role = 'CUSTOMER';
    const passwordHash = null; // CUSTOMER не имеет пароля

    const created = await prisma.$transaction(async (tx) => {
      // Генерируем уникальный referralCode
      let referralCode: string;
      let attempts = 0;
      do {
        const last = await tx.user.findFirst({
          orderBy: { id: 'desc' },
          select: { id: true },
        });
        const nextNum = (last?.id ?? 0) + 1000 + attempts;
        referralCode = `SAY${nextNum}`;
        
        // Проверяем уникальность
        const exists = await tx.user.findUnique({
          where: { referralCode },
          select: { id: true },
        });
        if (!exists) break;
        attempts++;
      } while (attempts < 10);

      // Защита: CUSTOMER не должен иметь пароль
      if (role === 'CUSTOMER' && passwordHash !== null) {
        throw new Error('CUSTOMER users must not have passwordHash');
      }

      return tx.user.create({
        data: {
          phone: p,
          name: name?.trim() || null,
          role,
          referralCode,
          bonusBalance: 0,
          slotsTotal: 1,
          passwordHash,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      user: { id: created.id, phone: created.phone },
    });
  } catch (e: any) {
    console.error('admin users create error', e);
    console.error('Error details:', {
      message: e?.message,
      code: e?.code,
      meta: e?.meta,
      stack: e?.stack,
    });
    return NextResponse.json(
      { 
        error: 'Внутренняя ошибка сервера',
        details: process.env.NODE_ENV === 'development' ? String(e?.message || e) : undefined,
      },
      { status: 500 },
    );
  }
}
