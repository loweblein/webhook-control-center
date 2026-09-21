import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api.js";
import type { Endpoint } from "../types.js";
import { ConfirmDialog } from "../ui/ConfirmDialog.js";
import { EmptyState } from "../ui/EmptyState.js";
import { Panel } from "../ui/Panel.js";
import { useToast } from "../ui/ToastProvider.js";

const supportedEventTypes = [
  "payment.completed",
  "user.created",
  "invoice.failed",
  "subscription.deleted"
] as const;

export function EndpointsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [eventTypes, setEventTypes] = useState<string[]>(["payment.completed"]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [endpointToDelete, setEndpointToDelete] = useState<Endpoint | null>(null);
  const endpoints = useQuery({ queryKey: ["endpoints"], queryFn: () => api<Endpoint[]>("/endpoints") });
  const createEndpoint = useMutation({
    mutationFn: () => api<Endpoint>("/endpoints", { method: "POST", body: { name, url, active: true, eventTypes } }),
    onSuccess: async () => {
      setName("");
      setUrl("");
      toast.success("Endpoint criado com sucesso.");
      await queryClient.invalidateQueries({ queryKey: ["endpoints"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível criar o endpoint.")
  });
  const updateEndpoint = useMutation({
    mutationFn: (endpoint: Endpoint) =>
      api<Endpoint>(`/endpoints/${endpoint.id}`, {
        method: "PUT",
        body: { active: !endpoint.active }
      }),
    onSuccess: async () => {
      toast.success("Endpoint atualizado.");
      await queryClient.invalidateQueries({ queryKey: ["endpoints"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o endpoint.")
  });
  const deleteEndpoint = useMutation({
    mutationFn: (id: string) => api<void>(`/endpoints/${id}`, { method: "DELETE" }),
    onSuccess: async (_data, id) => {
      setActionError(null);
      setEndpointToDelete(null);
      toast.success("Endpoint excluído.");
      queryClient.setQueryData<Endpoint[]>(["endpoints"], (current) =>
        current?.filter((endpoint) => endpoint.id !== id) ?? current
      );
      await queryClient.invalidateQueries({ queryKey: ["endpoints"] });
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : "Não foi possível excluir o endpoint.");
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o endpoint.");
    }
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    createEndpoint.mutate();
  }

  function toggleEvent(type: string) {
    setEventTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Criar endpoint">
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Nome
            <input className="mt-2 w-full rounded-md border-line dark:border-dark-line dark:bg-slate-950 dark:text-slate-100" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            URL
            <input className="mt-2 w-full rounded-md border-line dark:border-dark-line dark:bg-slate-950 dark:text-slate-100" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://api.example.com/webhooks" />
          </label>
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Assinaturas de eventos</p>
            <div className="mt-3 grid gap-2">
              {supportedEventTypes.map((type) => (
                <label key={type} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-700 dark:border-dark-line dark:bg-slate-950 dark:text-slate-200">
                  <input type="checkbox" checked={eventTypes.includes(type)} onChange={() => toggleEvent(type)} />
                  {type}
                </label>
              ))}
            </div>
          </div>
          <button disabled={createEndpoint.isPending} className="w-full rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70 dark:bg-emerald-600 dark:hover:bg-emerald-700">
            {createEndpoint.isPending ? "Criando" : "Criar endpoint"}
          </button>
        </form>
      </Panel>
      <Panel title="Endpoints">
        {actionError ? (
          <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{actionError}</p>
        ) : null}
        {endpoints.data?.length ? (
          <div className="space-y-3">
            {endpoints.data.map((endpoint) => (
              <div key={endpoint.id} className="rounded-lg border border-line bg-white p-4 dark:border-dark-line dark:bg-slate-950/40">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-950 dark:text-slate-50">{endpoint.name}</h3>
                      <span className={endpoint.active ? "text-xs font-semibold text-emerald-700" : "text-xs font-semibold text-slate-500"}>
                        {endpoint.active ? "ativo" : "inativo"}
                      </span>
                    </div>
                    <p className="mt-1 break-all font-mono text-xs text-slate-500 dark:text-slate-400">{endpoint.url}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {endpoint.eventTypes.map((type) => (
                        <span key={type} className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">{type}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-slate-700 dark:border-dark-line dark:text-slate-200" onClick={() => updateEndpoint.mutate(endpoint)}>
                      {endpoint.active ? "Desativar" : "Ativar"}
                    </button>
                    <button
                      type="button"
                      disabled={deleteEndpoint.isPending}
                      className="rounded-md border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:cursor-wait disabled:opacity-60"
                      onClick={() => setEndpointToDelete(endpoint)}
                    >
                      {deleteEndpoint.isPending ? "Excluindo" : "Excluir"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhum endpoint" detail="Crie um endpoint e assine um ou mais tipos de evento." />
        )}
      </Panel>
      <ConfirmDialog
        open={Boolean(endpointToDelete)}
        title="Excluir endpoint"
        description={`Tem certeza que deseja excluir ${endpointToDelete?.name ?? "este endpoint"}? O histórico de deliveries relacionado também será removido.`}
        confirmLabel="Excluir"
        loading={deleteEndpoint.isPending}
        onCancel={() => setEndpointToDelete(null)}
        onConfirm={() => {
          if (endpointToDelete) {
            deleteEndpoint.mutate(endpointToDelete.id);
          }
        }}
      />
    </div>
  );
}
