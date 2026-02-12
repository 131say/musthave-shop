// src/app/api/admin/products/toggle/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const { productId, isActive } = (body || {}) as {
      productId?: number;
      isActive?: boolean;
    };

    if (!productId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'productId и isActive обязательны' },
        { status: 400 },
      );
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: { isActive },
    });

    return NextResponse.json({ ok: true, product });
  } catch (e) {
    console.error('admin/products/toggle error', e);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 },
    );
  }
}






