import Link from 'next/link';

export default function BonusesPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Бонусы</h1>
      <div className="mt-4 rounded-2xl border border-rose-100 bg-white p-6 shadow-sm">
        <div className="text-slate-700">
          Здесь — правила бонусов и быстрые ссылки. Полная история и баланс — в кабинете.
        </div>
        <ul className="mt-4 list-disc pl-5 text-slate-600">
          <li>Бонусы начисляются с покупок (кэшбэк и бонус пригласителю — из настроек).</li>
          <li>Бонусы можно тратить на оплату заказа (в т.ч. до 100% — если разрешено в настройках).</li>
          <li>Слоты можно открывать за бонусы (цена считается по формуле из настроек).</li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/cabinet" className="rounded-xl bg-rose-500 px-4 py-3 text-sm text-white hover:bg-rose-600">
            Перейти в кабинет
          </Link>
          <Link href="/catalog" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
            В каталог
          </Link>
        </div>
      </div>
    </main>
  );
}






