type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  loading = false,
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel dark:shadow-soft-dark">
        <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 dark:border-dark-line dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            className="rounded-md bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-wait disabled:opacity-70"
            onClick={onConfirm}
          >
            {loading ? "Processando" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
