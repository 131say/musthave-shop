import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const userId = Number(id);
    if (Number.isNaN(userId)) {
      return NextResponse.json({ error: 'Некорректный ID' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        referredBy: {
          select: {
            id: true,
            phone: true,
            referralCode: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        referralCode: user.referralCode,
        bonusBalance: user.bonusBalance,
        role: user.role,
        referredBy: user.referredBy,
        referralsEnabled: (user as any).referralsEnabled ?? false,
        referralActivationRequested: (user as any).referralActivationRequested ?? false,
      },
    });
  } catch (e) {
    console.error('user profile api error', e);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}






