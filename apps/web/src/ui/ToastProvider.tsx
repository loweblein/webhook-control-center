import { CheckCircle, WarningCircle, X } from "@phosphor-icons/react";
import clsx from "clsx";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";

type ToastKind = "success" | "error";

type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
};

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, kind, message }].slice(-4));
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message)
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 space-y-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={clsx(
              "flex w-[min(420px,calc(100vw-2rem))] items-start gap-3 rounded-lg border bg-white p-4 text-sm shadow-soft dark:bg-dark-panel dark:shadow-soft-dark",
              toast.kind === "success"
                ? "border-emerald-200 text-emerald-900 dark:border-emerald-800 dark:text-emerald-100"
                : "border-rose-200 text-rose-900 dark:border-rose-800 dark:text-rose-100"
            )}
          >
            {toast.kind === "success" ? <CheckCircle size={20} weight="bold" /> : <WarningCircle size={20} weight="bold" />}
            <p className="flex-1 leading-5">{toast.message}</p>
            <button
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              aria-label="Fechar notificação"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser usado dentro de ToastProvider");
  }
  return context;
}
