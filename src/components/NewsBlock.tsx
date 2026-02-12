import { prisma } from '@/lib/prisma';

export default async function NewsBlock() {
  const posts = await prisma.newsPost.findMany({
    where: { isPublished: true },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: 5,
  });

  if (posts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white/70 p-5 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/70">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold dark:text-white">Новости</div>
        <div className="text-xs text-slate-500 dark:text-gray-400">MustHave</div>
      </div>
      <div className="mt-4 space-y-3">
        {posts.map((p) => (
          <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-800">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold dark:text-white">{p.title}</div>
                <div className="mt-1 line-clamp-3 text-sm text-slate-700 whitespace-pre-wrap dark:text-gray-300">
                  {p.content}
                </div>
              </div>
              {p.pinned && (
                <div className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  📌
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}






