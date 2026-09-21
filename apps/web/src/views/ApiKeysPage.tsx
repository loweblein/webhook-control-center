import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api.js";
import type { ApiKey } from "../types.js";
import { ConfirmDialog } from "../ui/ConfirmDialog.js";
import { EmptyState } from "../ui/EmptyState.js";
import { Panel } from "../ui/Panel.js";
import { useToast } from "../ui/ToastProvider.js";

export function ApiKeysPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);
  const keys = useQuery({ queryKey: ["api-keys"], queryFn: () => api<ApiKey[]>("/api-keys") });
  const create = useMutation({
    mutationFn: () => api<ApiKey>("/api-keys", { method: "POST", body: { name } }),
    onSuccess: async (data) => {
      setCreatedKey(data.key ?? null);
      setName("");
      toast.success("API key criada. Copie a chave antes de sair desta tela.");
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível criar a API key.")
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api<ApiKey>(`/api-keys/${id}/revoke`, { method: "POST" }),
    onSuccess: async () => {
      setKeyToRevoke(null);
      toast.success("API key revogada.");
      await queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível revogar a API key.")
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    create.mutate();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Criar API key">
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Nome
            <input className="mt-2 w-full rounded-md border-line dark:border-dark-line dark:bg-slate-950 dark:text-slate-100" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ingestão produção" />
          </label>
          <button disabled={create.isPending} className="w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70 dark:bg-emerald-600 dark:hover:bg-emerald-700">
            {create.isPending ? "Criando" : "Criar chave"}
          </button>
        </form>
        {createdKey ? (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Copie esta chave agora. Ela não será exibida novamente.</p>
            <code className="mt-3 block break-all rounded-md bg-white p-3 font-mono text-xs text-slate-900 dark:bg-slate-950 dark:text-slate-100">{createdKey}</code>
            <button
              type="button"
              className="mt-3 rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              onClick={() => {
                void navigator.clipboard.writeText(createdKey).then(() => {
                  toast.success("API key copiada.");
                });
              }}
            >
              Copiar chave
            </button>
          </div>
        ) : null}
      </Panel>
      <Panel title="API Keys">
        {keys.data?.length ? (
          <div className="space-y-3">
            {keys.data.map((key) => (
              <div key={key.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-white p-4 dark:border-dark-line dark:bg-slate-950/40">
                <div>
                  <p className="font-semibold text-slate-950 dark:text-slate-50">{key.name}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">{key.prefix}••••••••••••••••</p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Criada em {new Date(key.createdAt).toLocaleString()} · Último uso {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "nunca"}
                  </p>
                </div>
                {key.revokedAt ? (
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">revogada</span>
                ) : (
                  <button className="rounded-md border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:text-rose-300" onClick={() => setKeyToRevoke(key)}>
                    Revogar
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhuma API key" detail="Crie uma chave para autenticar a ingestão de eventos via POST /v1/events." />
        )}
      </Panel>
      <ConfirmDialog
        open={Boolean(keyToRevoke)}
        title="Revogar API key"
        description={`Tem certeza que deseja revogar ${keyToRevoke?.name ?? "esta API key"}? Clientes usando essa chave não conseguirão mais enviar eventos.`}
        confirmLabel="Revogar"
        loading={revoke.isPending}
        onCancel={() => setKeyToRevoke(null)}
        onConfirm={() => {
          if (keyToRevoke) {
            revoke.mutate(keyToRevoke.id);
          }
        }}
      />
    </div>
  );
}
