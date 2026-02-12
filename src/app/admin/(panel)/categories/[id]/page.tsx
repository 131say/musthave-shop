"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Cat = { id: number; name: string; slug: string; parentId: number | null };

export default function AdminCategoryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const categoryId = Number(id);

  const [cats, setCats] = useState<Cat[]>([]);
  const [cat, setCat] = useState<Cat | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const [a, b] = await Promise.all([
          fetch(`/api/admin/categories/${categoryId}`).then((r) => r.json()),
          fetch(`/api/admin/categories`).then((r) => r.json()),
        ]);
        if (!ok) return;
        setCat(a?.category || null);
        setCats(Array.isArray(b?.categories) ? b.categories : []);
        setName(a?.category?.name || "");
        setSlug(a?.category?.slug || "");
        setParentId(a?.category?.parentId ? String(a.category.parentId) : "");
      } catch (e: any) {
        if (!ok) return;
        setError(e?.message || "Ошибка загрузки");
      } finally {
        if (ok) setLoading(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [categoryId]);

  const options = useMemo(
    () => cats.filter((c) => c.id !== categoryId).slice().sort((a, b) => a.name.localeCompare(b.name)),
    [cats, categoryId]
  );

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug || undefined,
          parentId: parentId ? Number(parentId) : null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || json?.details || "Ошибка сохранения");
      router.push("/admin/categories");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm("Удалить категорию? Связи с товарами будут удалены.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || json?.details || "Ошибка удаления");
      router.push("/admin/categories");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Ошибка удаления");
    } finally {
      setDeleting(false);
    }
  }

  if (!Number.isFinite(categoryId)) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">Неверный ID</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Редактировать категорию</h1>
        <div className="flex gap-2">
          <Link className="rounded-xl border px-4 py-2 hover:bg-gray-50" href="/admin/categories">
            Назад
          </Link>
          <button
            className="rounded-xl px-4 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-60"
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? "Удаление..." : "Удалить"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>
      ) : null}

      <div className="rounded-2xl border bg-white p-5 space-y-4">
        {loading ? (
          <div className="text-gray-500">Загрузка...</div>
        ) : !cat ? (
          <div className="text-rose-700">Категория не найдена</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <div className="text-sm text-gray-600">Название *</div>
                <input className="w-full rounded-xl border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="space-y-1">
                <div className="text-sm text-gray-600">Slug</div>
                <input className="w-full rounded-xl border px-3 py-2" value={slug} onChange={(e) => setSlug(e.target.value)} />
              </label>
              <label className="space-y-1 md:col-span-2">
                <div className="text-sm text-gray-600">Родитель</div>
                <select className="w-full rounded-xl border px-3 py-2" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                  <option value="">— Без родителя —</option>
                  {options.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name} (#{c.id})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                className="rounded-xl px-4 py-2 bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-60"
                onClick={onSave}
                disabled={saving || !name.trim()}
              >
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
              <button className="rounded-xl border px-4 py-2 hover:bg-gray-50" onClick={() => location.reload()}>
                Обновить
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}






