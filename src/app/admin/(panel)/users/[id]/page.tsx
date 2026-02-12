'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { TreeNode } from '@/lib/userTree';

type SlotItem =
  | { slot: number; occupied: false }
  | {
      slot: number;
      occupied: true;
      user: { id: number; phone: string; name?: string | null };
    };

type UserProfile = {
  id: number;
  phone: string;
  name: string | null;
  referralCode: string;
  bonusBalance: number;
  role: string;
  referredBy: { id: number; phone: string; referralCode: string } | null;
  referralsEnabled?: boolean;
  referralActivationRequested?: boolean;
};

function money(n: number) {
  return new Intl.NumberFormat('ru-RU').format(n);
}

export default function AdminUserPage() {
  const router = useRouter();
  const params = useParams();
  const id = useMemo(() => Number(params?.id), [params]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [slotsTotal, setSlotsTotal] = useState(1);
  const [slots, setSlots] = useState<SlotItem[]>([]);

  const [createSlot, setCreateSlot] = useState<number | null>(null);
  const [phone, setPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [referralsEnabled, setReferralsEnabled] = useState(false);
  const [savingReferrals, setSavingReferrals] = useState(false);

  const loadProfile = async () => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Ошибка загрузки профиля');
      setProfile(data.user);
      setReferralsEnabled(data.user?.referralsEnabled ?? false);
    } catch (e: any) {
      setError(e?.message || 'Ошибка');
    }
  };

  const loadTree = async () => {
    try {
      const res = await fetch(`/api/admin/users/${id}/tree?depth=3&days=30`, {
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Ошибка загрузки дерева');
      setTree(data.tree);
    } catch (e: any) {
      console.error('Tree load error', e);
    }
  };

  const loadSlots = async () => {
    try {
      const res = await fetch(`/api/admin/users/${id}/layout`, { cache: 'no-store' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Ошибка загрузки слотов');
      setSlotsTotal(data.slotsTotal);
      setSlots(data.slots);
    } catch (e: any) {
      console.error('Slots load error', e);
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([loadProfile(), loadTree(), loadSlots()]);
    setLoading(false);
  };

  useEffect(() => {
    if (!id || Number.isNaN(id)) {
      setError('Некорректный ID');
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const incDec = async (action: 'INC' | 'DEC') => {
    try {
      const res = await fetch(`/api/admin/users/${id}/slotsTotal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Ошибка');
      await loadSlots();
    } catch (e: any) {
      alert(e?.message || 'Ошибка');
    }
  };

  const submitCreate = async () => {
    if (!createSlot) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/admin/users/${id}/slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot: createSlot, phone }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Ошибка');
      setCreateSlot(null);
      setPhone('');
      await loadSlots();
      alert('Пользователь создан. Он сможет войти через код в WhatsApp.');
    } catch (e: any) {
      alert(e?.message || 'Ошибка');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Загрузка...
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-600">
        {error || 'Пользователь не найден'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Пользователь #{id}</h1>
        <button
          onClick={() => router.back()}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
        >
          Назад
        </button>
      </div>

      {/* Профиль */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="text-sm font-semibold mb-4">Профиль</div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs text-slate-500">Телефон</div>
            <div className="text-sm font-medium">{profile.phone}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Реферальный код</div>
            <div className="text-sm font-medium text-rose-600">{profile.referralCode}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Имя</div>
            <div className="text-sm font-medium">{profile.name || '—'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Роль</div>
            <div className="text-sm font-medium">{profile.role}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Баланс бонусов</div>
            <div className="text-sm font-semibold text-emerald-600">
              {money(profile.bonusBalance)} ₸
            </div>
          </div>
          {profile.referredBy && (
            <div>
              <div className="text-xs text-slate-500">Пригласил</div>
              <Link
                href={`/admin/users/${profile.referredBy.id}`}
                className="text-sm font-medium text-rose-600 hover:underline"
              >
                {profile.referredBy.phone} ({profile.referredBy.referralCode})
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Дерево */}
      {tree && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-sm font-semibold mb-4">Дерево рефералов (3 уровня)</div>
          <TreeView node={tree} level={0} />
        </div>
      )}

      {/* Доступ к рефералам */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-3 text-sm font-semibold">Доступ к рефералам (для блоггеров)</div>
        <div className="text-xs text-slate-600 mb-3">
          Включите доступ для блоггеров, которые будут приводить клиентов пачками. Для них не будет ограничений по слотам.
        </div>
        {profile?.referralActivationRequested && !profile?.referralsEnabled && (
          <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            ⚠️ Пользователь запросил активацию реферальной программы
          </div>
        )}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={referralsEnabled}
              onChange={(e) => setReferralsEnabled(e.target.checked)}
              disabled={savingReferrals}
              className="h-4 w-4 rounded border-slate-300 text-rose-500 focus:ring-rose-500"
            />
            <span className="text-sm text-slate-700">
              {referralsEnabled ? "Доступ включен" : "Доступ выключен"}
            </span>
          </label>
          <button
            disabled={savingReferrals || referralsEnabled === (profile?.referralsEnabled ?? false)}
            onClick={async () => {
              try {
                setSavingReferrals(true);
                const res = await fetch(`/api/admin/users/${id}/referrals-enabled`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ enabled: referralsEnabled }),
                });
                const data = await res.json().catch(() => null);
                if (!res.ok) throw new Error(data?.error || "Ошибка");
                await loadProfile();
                alert("Доступ к рефералам обновлён");
              } catch (e: any) {
                alert(e?.message || "Ошибка");
                setReferralsEnabled(profile?.referralsEnabled ?? false);
              } finally {
                setSavingReferrals(false);
              }
            }}
            className="rounded-xl bg-rose-500 px-4 py-2 text-sm text-white hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingReferrals ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>

      {/* Пароль */}
      <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
        <div className="mb-3 text-lg font-semibold">Пароль пользователя</div>
        <div className="text-sm text-slate-600">
          Если пользователь не может войти — задай новый пароль тут.
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Новый пароль"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-rose-300"
            type="password"
          />
          <button
            disabled={!newPassword || saving}
            onClick={async () => {
              try {
                setSaving(true);
                const res = await fetch(`/api/admin/users/${id}/password`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ password: newPassword }),
                });
                const data = await res.json().catch(() => null);
                if (!res.ok) throw new Error(data?.error || "Ошибка");
                setNewPassword("");
                alert("Пароль обновлён");
              } catch (e: any) {
                alert(e?.message || "Ошибка");
              } finally {
                setSaving(false);
              }
            }}
            className="rounded-xl bg-rose-500 px-4 py-3 text-sm text-white hover:bg-rose-600 disabled:opacity-50"
          >
            Сохранить пароль
          </button>
        </div>
      </div>

      {/* Слоты - только для обычных пользователей (не блоггеров) */}
      {!profile?.referralsEnabled && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold">Слоты</div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-slate-500">
                Доступно: <b>{slotsTotal}</b>
              </div>
              <button
                onClick={() => incDec('INC')}
                className="rounded-xl bg-rose-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600"
              >
                + Добавить
              </button>
              <button
                onClick={() => incDec('DEC')}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs hover:bg-slate-50"
              >
                − Удалить
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {slots.map((s) => (
              <div key={s.slot} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Слот</div>
                <div className="text-sm font-semibold">#{s.slot}</div>

                {s.occupied ? (
                  <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                    <div className="text-xs font-medium">{s.user.name || '—'}</div>
                    <div className="text-[11px] text-slate-500">{s.user.phone}</div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <button
                      onClick={() => setCreateSlot(s.slot)}
                      className="w-full rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-600"
                    >
                      Создать
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {profile?.referralsEnabled && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="text-sm font-semibold text-amber-800">Система слотов отключена</div>
          <div className="mt-2 text-xs text-amber-700">
            Для блоггеров система слотов отключена. Они могут приглашать неограниченное количество пользователей через реферальную программу.
          </div>
        </div>
      )}

      {createSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow">
            <div className="text-lg font-semibold">
              Создать пользователя в слот #{createSlot}
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="text-xs font-medium text-slate-500">Телефон (+7...)</div>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-100"
                  placeholder="+77011234567"
                />
              </div>
            </div>

            <div className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
              Пользователь войдёт в аккаунт через код в WhatsApp. Пароль не требуется.
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setCreateSlot(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                disabled={creating || !phone.trim()}
                onClick={submitCreate}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:bg-slate-300"
              >
                {creating ? 'Создаю...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TreeView({ node, level }: { node: TreeNode; level: number }) {
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className={level > 0 ? 'mt-3 ml-6 border-l-2 border-slate-200 pl-4' : ''}>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Ур. {level + 1}</span>
              <Link
                href={`/admin/users/${node.userId}`}
                className="text-sm font-medium text-rose-600 hover:underline truncate"
              >
                {node.phone}
              </Link>
            </div>
            <div className="text-xs text-rose-600 mt-0.5">{node.referralCode}</div>
          </div>
          <div className="text-right text-xs space-y-0.5">
            <div className="text-slate-600">
              Баланс: <span className="font-semibold text-emerald-600">{money(node.bonusBalance)} ₸</span>
            </div>
            <div className="text-slate-600">
              Прямых: <span className="font-semibold">{node.directCount}</span>
            </div>
            {node.revenue30d > 0 && (
              <div className="text-slate-600">
                Оборот 30д: <span className="font-semibold">{money(node.revenue30d)} ₸</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {hasChildren && (
        <div className="mt-2 space-y-2">
          {node.children!.map((child) => (
            <TreeView key={child.userId} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}






