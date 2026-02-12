import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(req: Request) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').trim();
    const status = (url.searchParams.get('status') || 'all').trim(); // all | published | draft

    const where: any = {};
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (status === 'published') where.isPublished = true;
    if (status === 'draft') where.isPublished = false;

    const posts = await prisma.newsPost.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 200,
    });

    return NextResponse.json({ ok: true, posts });
  } catch (e) {
    console.error('admin/news GET error', e);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Проверка должна быть server-side, не только в UI
    const authCheck = await requireAdmin();
    if (authCheck) return authCheck;
    
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });

    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    const isPublished = Boolean(body.isPublished);
    const pinned = Boolean(body.pinned);

    if (!title) return NextResponse.json({ error: 'title обязателен' }, { status: 400 });
    if (!content) return NextResponse.json({ error: 'content обязателен' }, { status: 400 });

    const created = await prisma.newsPost.create({
      data: { title, content, isPublished, pinned },
    });

    return NextResponse.json({ ok: true, post: created });
  } catch (e) {
    console.error('admin/news POST error', e);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}







