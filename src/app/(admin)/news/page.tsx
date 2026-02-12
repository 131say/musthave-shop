// src/app/(admin)/news/page.tsx

export const dynamic = 'force-dynamic';

export default async function AdminNewsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Новости</h2>
        <button className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm hover:bg-rose-600">
          Создать новость
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <p className="text-slate-500">Список новостей будет здесь</p>
        <p className="text-sm text-slate-400 mt-2">Скоро добавим</p>
      </div>
    </div>
  );
}






