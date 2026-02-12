"use client";

import { useEffect, useMemo, useState } from "react";

type Category = { id: number; name: string; slug: string; parentId: number | null };

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("");

  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editParentId, setEditParentId] = useState<string>("");

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/categories", { cache: "no-store" });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "Ошибка загрузки категорий");
      setItems(d.categories || []);
    } catch (e: any) {
      setErr(e?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const byId = useMemo(() => new Map(items.map((c) => [c.id, c])), [items]);

  const startEdit = (c: Category) => {
    setEditId(c.id);
    setEditName(c.name);
    setEditParentId(c.parentId == null ? "" : String(c.parentId));
  };

  const saveEdit = async () => {
    if (!editId) return;
    setErr(null);
    try {
      const r = await fetch(`/api/admin/categories/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), parentId: editParentId || null }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "Ошибка сохранения");
      setEditId(null);
      await load();
    } catch (e: any) {
      setErr(e?.message || "Ошибка");
    }
  };

  const create = async () => {
    setErr(null);
    try {
      const r = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), parentId: parentId || null }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "Ошибка создания");
      setName("");
      setParentId("");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Ошибка");
    }
  };

  const remove = async (id: number) => {
    setErr(null);
    try {
      const r = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "Ошибка удаления");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Ошибка");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Категории</h1>
        <button onClick={load} className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-neutral-900">
          Обновить
        </button>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          {err}
        </div>
      ) : null}

      <div className="rounded-2xl border p-4 dark:border-neutral-800">
        <div className="text-sm font-medium mb-3">Создать категорию</div>
        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название"
            className="rounded-xl border px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
          />
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
          >
            <option value="">Без родителя</option>
            {items.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={create}
            disabled={!name.trim()}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm text-white disabled:bg-slate-300"
          >
            Создать
          </button>
        </div>
      </div>

      <div className="rounded-2xl border p-4 dark:border-neutral-800">
        <div className="text-sm font-medium mb-3">Список</div>
        {loading ? <div className="text-sm opacity-70">Загрузка...</div> : null}

        <div className="divide-y dark:divide-neutral-800">
          {items.map((c) => {
            const parent = c.parentId ? byId.get(c.parentId) : null;
            const isEditing = editId === c.id;
            return (
              <div key={c.id} className="py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="font-medium dark:text-white">
                    {c.name} <span className="text-xs opacity-60">#{c.id}</span>
                  </div>
                  <div className="text-xs opacity-70">
                    slug: <span className="font-mono">{c.slug}</span>
                    {parent ? <> · parent: {parent.name}</> : null}
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="rounded-xl border px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                    />
                    <select
                      value={editParentId}
                      onChange={(e) => setEditParentId(e.target.value)}
                      className="rounded-xl border px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                    >
                      <option value="">Без родителя</option>
                      {items
                        .filter((x) => x.id !== c.id)
                        .map((x) => (
                          <option key={x.id} value={String(x.id)}>
                            {x.name}
                          </option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="rounded-xl bg-black px-4 py-2 text-sm text-white dark:bg-white dark:text-black">
                        Сохранить
                      </button>
                      <button onClick={() => setEditId(null)} className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-neutral-900">
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(c)}
                      className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-neutral-900"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
                    >
                      Удалить
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
