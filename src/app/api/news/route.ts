import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(20, Number(url.searchParams.get('limit') || 5)));

    const posts = await prisma.newsPost.findMany({
      where: { isPublished: true },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    return NextResponse.json({ ok: true, posts });
  } catch (e) {
    console.error('news GET error', e);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}







