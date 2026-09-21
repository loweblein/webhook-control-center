import type { PropsWithChildren, ReactNode } from "react";

export function Panel({ title, action, children }: PropsWithChildren<{ title: string; action?: ReactNode }>) {
  return (
    <section className="rounded-lg border border-line bg-panel shadow-soft dark:border-dark-line dark:bg-dark-panel dark:shadow-soft-dark">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 dark:border-dark-line">
        <h2 className="text-sm font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
