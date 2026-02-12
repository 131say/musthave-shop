'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-rose-50 to-white dark:bg-neutral-950 p-4">
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 dark:border-red-900/40 dark:bg-neutral-900">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Ошибка приложения</h2>
        <pre
          className="whitespace-pre-wrap bg-neutral-900 text-green-400 p-4 rounded-lg text-sm overflow-auto max-h-64 dark:bg-neutral-950"
        >
          {String(error?.message || error)}
          {'\n'}
          {error?.stack || ''}
          {'\n'}
          digest: {error?.digest || '—'}
        </pre>
        <button 
          onClick={() => reset()} 
          className="mt-4 w-full rounded-xl bg-rose-500 px-4 py-3 text-white hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700"
        >
          Повторить
        </button>
      </div>
    </div>
  );
}







