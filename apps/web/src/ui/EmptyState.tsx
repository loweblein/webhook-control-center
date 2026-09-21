export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-dark-line dark:bg-slate-950/40">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}
