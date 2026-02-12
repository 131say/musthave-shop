// src/app/(admin)/users/page.tsx

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Пользователи</h2>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <p className="text-slate-500">Список пользователей будет здесь</p>
        <p className="text-sm text-slate-400 mt-2">Скоро добавим</p>
      </div>
    </div>
  );
}






