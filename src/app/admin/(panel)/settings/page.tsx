"use client";

import { useEffect, useState } from "react";

type Settings = {
  id: number;
  customerPercent: number;
  inviterPercent: number;
  inviterBonusLevel2Percent: number;
  allowFullBonusPay: boolean;
  reservePercent: number;
  slotBaseBonus: number;
  slotStepBonus: number;
  promoTitle?: string | null;
  promoDescription?: string | null;
  promoTags?: string | null;
  promoImageUrl?: string | null;
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      setError(null);
      const res = await fetch("/api/admin/settings", { cache: "no-store" as any });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "Ошибка загрузки настроек");
        return;
      }
      const loadedSettings = data.settings;
      setSettings({
        ...loadedSettings,
        inviterBonusLevel2Percent: loadedSettings.inviterBonusLevel2Percent ?? 2,
        reservePercent: loadedSettings.reservePercent ?? 30,
        slotBaseBonus: loadedSettings.slotBaseBonus ?? 1000,
        slotStepBonus: loadedSettings.slotStepBonus ?? 500,
      });
    })();
  }, []);

  async function save() {
    if (!settings) return;
    setSaved(false);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerPercent: settings.customerPercent,
          inviterPercent: settings.inviterPercent,
          inviterBonusLevel2Percent: settings.inviterBonusLevel2Percent,
          allowFullBonusPay: settings.allowFullBonusPay,
          reservePercent: settings.reservePercent,
          slotBaseBonus: settings.slotBaseBonus,
          slotStepBonus: settings.slotStepBonus,
          promoTitle: settings.promoTitle || null,
          promoDescription: settings.promoDescription || null,
          promoTags: settings.promoTags || null,
          promoImageUrl: settings.promoImageUrl || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Ошибка сохранения");
      setSettings(data.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e: any) {
      setError(e?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight dark:text-white">Настройки</h1>
        {saved && <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Сохранено ✓</div>}
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{error}</div>
      )}

      {!settings ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-400">Загрузка…</div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="text-sm font-semibold dark:text-white">Экономика</div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Кэшбэк клиенту (%)</div>
              <input
                type="number"
                min={0}
                max={20}
                value={settings.customerPercent}
                onChange={(e) => setSettings({ ...settings, customerPercent: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-amber-900"
              />
              <div className="mt-1 text-[11px] text-slate-500 dark:text-gray-400">Рекомендуем: 2–4%</div>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Бонус пригласителю (%)</div>
              <input
                type="number"
                min={0}
                max={20}
                value={settings.inviterPercent}
                onChange={(e) => setSettings({ ...settings, inviterPercent: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-amber-900"
              />
              <div className="mt-1 text-[11px] text-slate-500 dark:text-gray-400">Рекомендуем: 4–6%</div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Бонус 2-го уровня (%)</div>
              <input
                type="number"
                min={0}
                max={20}
                value={settings.inviterBonusLevel2Percent}
                onChange={(e) => setSettings({ ...settings, inviterBonusLevel2Percent: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-amber-900"
              />
              <div className="mt-1 text-[11px] text-slate-500 dark:text-gray-400">Рекомендуем: 1–2%</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Резерв (%) от оплат деньгами (cashPaid)</div>
            <input
              type="number"
              min={0}
              max={100}
              value={settings.reservePercent}
              onChange={(e) => setSettings({ ...settings, reservePercent: Number(e.target.value) })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-rose-900"
            />
            <div className="mt-1 text-[11px] text-slate-500 dark:text-gray-400">0–100% (рекомендация: 20–50%)</div>
          </div>

          <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-300">
            <input
              type="checkbox"
              checked={settings.allowFullBonusPay}
              onChange={(e) => setSettings({ ...settings, allowFullBonusPay: e.target.checked })}
            />
            Разрешить оплату бонусами до 100%
          </label>

          <div className="text-sm font-semibold mt-4 dark:text-white">Слоты (только за бонусы)</div>
          <div className="text-xs text-slate-500 mb-3 dark:text-gray-400">
            Формула: цена следующего слота = base + step × (номерСлота − 2)
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Base (2-й слот), бонусы</div>
              <input
                type="number"
                min={0}
                max={100000}
                value={settings.slotBaseBonus}
                onChange={(e) => setSettings({ ...settings, slotBaseBonus: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-amber-900"
              />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Step, бонусы</div>
              <input
                type="number"
                min={0}
                max={100000}
                value={settings.slotStepBonus}
                onChange={(e) => setSettings({ ...settings, slotStepBonus: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-amber-900"
              />
            </div>
          </div>

          <button
            onClick={save}
            disabled={loading}
            className="w-full rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:bg-slate-300 dark:disabled:bg-neutral-700"
          >
            {loading ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      )}

      {/* Промо-блок на главной странице */}
      {settings && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="text-sm font-semibold dark:text-white">Промо-блок на главной странице</div>
          
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Заголовок</div>
            <input
              type="text"
              value={settings.promoTitle || ""}
              onChange={(e) => setSettings({ ...settings, promoTitle: e.target.value })}
              placeholder="Косметика и уход, которые хочется повторять"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-amber-900"
            />
            <div className="mt-1 text-[11px] text-slate-500 dark:text-gray-400">Текст после запятой будет выделен золотым цветом</div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Описание</div>
            <textarea
              value={settings.promoDescription || ""}
              onChange={(e) => setSettings({ ...settings, promoDescription: e.target.value })}
              placeholder="Подборка проверенной косметики и средств ухода с доставкой по всему Казахстану..."
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-amber-900"
            />
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-gray-400">Теги (каждый с новой строки)</div>
            <textarea
              value={settings.promoTags ? JSON.parse(settings.promoTags).join("\n") : ""}
              onChange={(e) => {
                const tags = e.target.value.split("\n").filter(t => t.trim()).map(t => t.trim());
                setSettings({ ...settings, promoTags: tags.length > 0 ? JSON.stringify(tags) : null });
              }}
              placeholder="+ бонусы за каждый заказ&#10;доставка по Казахстану&#10;оригинальная продукция"
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-amber-900"
            />
            <div className="mt-1 text-[11px] text-slate-500 dark:text-gray-400">Каждый тег с новой строки</div>
          </div>

          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-gray-400">URL изображения (опционально)</div>
            <input
              type="url"
              value={settings.promoImageUrl || ""}
              onChange={(e) => setSettings({ ...settings, promoImageUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:focus:ring-amber-900"
            />
          </div>

          <button
            onClick={save}
            disabled={loading}
            className="w-full rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:bg-slate-300 dark:disabled:bg-neutral-700"
          >
            {loading ? "Сохраняем..." : "Сохранить промо-блок"}
          </button>
        </div>
      )}
    </div>
  );
}






