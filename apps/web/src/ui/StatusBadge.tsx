import clsx from "clsx";
import type { Delivery } from "../types.js";

const styles: Record<Delivery["status"], string> = {
  PENDING: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
  PROCESSING: "bg-cyan-50 text-cyan-700 ring-cyan-200 dark:bg-cyan-950 dark:text-cyan-200 dark:ring-cyan-800",
  SUCCESS: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800",
  FAILED: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800",
  DEAD: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-800"
};

const labels: Record<Delivery["status"], string> = {
  PENDING: "PENDENTE",
  PROCESSING: "PROCESSANDO",
  SUCCESS: "SUCESSO",
  FAILED: "FALHA",
  DEAD: "ESGOTADA"
};

export function StatusBadge({ status }: { status: Delivery["status"] }) {
  return (
    <span className={clsx("rounded-md px-2 py-1 text-xs font-semibold ring-1", styles[status])}>
      {labels[status]}
    </span>
  );
}
