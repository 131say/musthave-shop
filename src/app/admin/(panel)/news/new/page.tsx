'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminNewsNewPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createPost() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, isPublished, pinned }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Ошибка создания');
      router.push(`/admin/news/${data.post.id}`);
    } catch (e: any) {
      setError(e?.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Создать новость</h1>
        <Link
          href="/admin/news"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
        >
          Назад
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div>
          <div className="text-xs font-medium text-slate-500">Заголовок *</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100"
            placeholder="Поступление Cosrx / Акция недели / Новинка"
          />
        </div>

        <div>
          <div className="text-xs font-medium text-slate-500">Текст *</div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100"
            rows={8}
            placeholder="Коротко и по делу: что, для кого, почему стоит купить."
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
            />
            Опубликовать
          </label>
          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            Закрепить
          </label>
        </div>

        <button
          disabled={loading || !title.trim() || !content.trim()}
          onClick={createPost}
          className="w-full rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-600 disabled:bg-slate-300"
        >
          {loading ? 'Создаём...' : 'Создать'}
        </button>
      </div>
    </div>
  );
}







