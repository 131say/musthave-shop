// src/app/admin/news/page.tsx
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

function fmt(d: Date) {
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(d);
}

export const dynamic = 'force-dynamic';

export default async function AdminNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q || '').trim();
  const status = (sp.status || 'all').trim(); // all | published | draft

  const where: any = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { content: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (status === 'published') where.isPublished = true;
  if (status === 'draft') where.isPublished = false;

  const posts = await (prisma as any).newsPost.findMany({
    where,
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight dark:text-white">Новости</h1>
        <Link
          href="/admin/news/new"
          className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600"
        >
          Создать новость
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
        <form className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            name="q"
            defaultValue={q}
            placeholder="Поиск по заголовку/тексту"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-rose-900"
          />
          <select
            name="status"
            defaultValue={status}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-rose-900 md:w-48"
          >
            <option value="all">Все</option>
            <option value="published">Опубликованные</option>
            <option value="draft">Черновики</option>
          </select>
          <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700 md:w-auto">
            Применить
          </button>
          <Link
            href="/admin/news"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700 md:w-auto"
          >
            Сбросить
          </Link>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        <div className="grid grid-cols-[90px_1fr_120px] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 dark:bg-neutral-800 dark:text-gray-300">
          <div>Статус</div>
          <div>Заголовок</div>
          <div className="text-right">Дата</div>
        </div>
        {posts.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-600 dark:text-gray-400">Новостей пока нет.</div>
        ) : (
          posts.map((p: { id: number; title: string; content: string; isPublished: boolean; pinned: boolean; createdAt: Date }) => (
            <Link
              key={p.id}
              href={`/admin/news/${p.id}`}
              className="grid grid-cols-[90px_1fr_120px] gap-3 border-t border-slate-200 px-4 py-3 hover:bg-slate-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              <div className="text-xs">
                <span
                  className={`inline-flex rounded-lg border px-2 py-1 ${
                    p.isPublished
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-400'
                  }`}
                >
                  {p.isPublished ? 'PUBLISHED' : 'DRAFT'}
                </span>
                {p.pinned && (
                  <div className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">PINNED</div>
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium dark:text-white">{p.title}</div>
                <div className="truncate text-xs text-slate-500 dark:text-gray-400">{p.content}</div>
              </div>
              <div className="text-right text-xs text-slate-500 dark:text-gray-400">{fmt(p.createdAt)}</div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

