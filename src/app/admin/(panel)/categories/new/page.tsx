"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Cat = { id: number; name: string; parentId: number | null };

export default function AdminCategoryNewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<Cat[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/categories");
        const json = await res.json();
        if (!ok) return;
        setCats(Array.isArray(json?.categories) ? json.categories : []);
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
  }, []);

  const options = useMemo(() => cats.slice().sort((a, b) => a.name.localeCompare(b.name)), [cats]);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories", {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Создать категорию</h1>
        <Link className="rounded-xl border px-4 py-2 hover:bg-gray-50" href="/admin/categories">
          Назад
        </Link>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>
      ) : null}

      <div className="rounded-2xl border bg-white p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1">
            <div className="text-sm text-gray-600">Название *</div>
            <input
              className="w-full rounded-xl border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Очищение"
            />
          </label>

          <label className="space-y-1">
            <div className="text-sm text-gray-600">Slug (опционально)</div>
            <input
              className="w-full rounded-xl border px-3 py-2"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Авто если пусто"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <div className="text-sm text-gray-600">Родитель (опционально)</div>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              disabled={loading}
            >
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
          <Link className="rounded-xl border px-4 py-2 hover:bg-gray-50" href="/admin/categories">
            Отмена
          </Link>
        </div>
      </div>
    </div>
  );
}






