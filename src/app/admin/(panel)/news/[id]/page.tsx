'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';

type Post = {
  id: number;
  title: string;
  content: string;
  isPublished: boolean;
  pinned: boolean;
  createdAt: string;
};

export default function AdminNewsEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: idStr } = use(params);
  const id = Number(idStr);

  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/news/${id}`, { cache: 'no-store' as any });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || 'Ошибка загрузки');
        const p = data.post as Post;
        setPost(p);
        setTitle(p.title);
        setContent(p.content);
        setIsPublished(!!p.isPublished);
        setPinned(!!p.pinned);
      } catch (e: any) {
        setError(e?.message || 'Ошибка');
      }
    })();
  }, [id]);

  async function save() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/news/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, isPublished, pinned }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Ошибка сохранения');
      setPost(data.post);
    } catch (e: any) {
      setError(e?.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!confirm('Удалить новость?')) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/news/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Ошибка удаления');
      router.push('/admin/news');
    } catch (e: any) {
      setError(e?.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Редактировать новость</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/news"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
          >
            Назад
          </Link>
          <button
            onClick={remove}
            disabled={loading}
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
          >
            Удалить
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!post ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Загрузка…
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <div className="text-xs font-medium text-slate-500">Заголовок *</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100"
              />
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500">Текст *</div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100"
                rows={10}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                Опубликовано
              </label>
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
                Закрепить
              </label>
            </div>

            <button
              disabled={loading || !title.trim() || !content.trim()}
              onClick={save}
              className="w-full rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-600 disabled:bg-slate-300"
            >
              {loading ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold">Превью</div>
            <div className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <div className="text-base font-semibold">{title || 'Заголовок'}</div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                {content || 'Текст новости…'}
              </div>
              <div className="mt-3 text-xs text-slate-500">
                {pinned ? '📌 Закреплено' : ' '}
                {isPublished ? ' · опубликовано' : ' · черновик'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

