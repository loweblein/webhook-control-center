import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api.js";
import type { Delivery, Endpoint } from "../types.js";
import { EmptyState } from "../ui/EmptyState.js";
import { Panel } from "../ui/Panel.js";
import { StatusBadge } from "../ui/StatusBadge.js";
import { useToast } from "../ui/ToastProvider.js";

export function DeliveriesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [endpointId, setEndpointId] = useState("");
  const [eventType, setEventType] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"attempts" | "payload" | "response">("attempts");
  const endpoints = useQuery({ queryKey: ["endpoints"], queryFn: () => api<Endpoint[]>("/endpoints") });
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (endpointId) params.set("endpointId", endpointId);
    if (eventType) params.set("eventType", eventType);
    return params.toString();
  }, [endpointId, eventType, status]);
  const deliveries = useQuery({
    queryKey: ["deliveries", query],
    queryFn: () => api<Delivery[]>(`/deliveries${query ? `?${query}` : ""}`)
  });
  const detail = useQuery({
    queryKey: ["delivery", selectedId],
    queryFn: () => api<Delivery>(`/deliveries/${selectedId}`),
    enabled: Boolean(selectedId)
  });
  const replay = useMutation({
    mutationFn: (id: string) => api<Delivery>(`/deliveries/${id}/replay`, { method: "POST" }),
    onSuccess: async () => {
      toast.success("Replay enfileirado com sucesso.");
      await queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      await queryClient.invalidateQueries({ queryKey: ["delivery", selectedId] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível reexecutar a delivery.")
  });

  function apply(event: FormEvent) {
    event.preventDefault();
    void deliveries.refetch();
  }

  const statusOptions = [
    ["PENDING", "Pendente"],
    ["PROCESSING", "Processando"],
    ["SUCCESS", "Sucesso"],
    ["FAILED", "Falha"],
    ["DEAD", "Esgotada"]
  ] as const;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Panel title="Deliveries">
        <form onSubmit={apply} className="mb-5 grid gap-3 md:grid-cols-4">
          <select className="rounded-md border-line text-sm dark:border-dark-line dark:bg-slate-950 dark:text-slate-100" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todos os status</option>
            {statusOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select className="rounded-md border-line text-sm dark:border-dark-line dark:bg-slate-950 dark:text-slate-100" value={endpointId} onChange={(event) => setEndpointId(event.target.value)}>
            <option value="">Todos os endpoints</option>
            {endpoints.data?.map((endpoint) => (
              <option key={endpoint.id} value={endpoint.id}>{endpoint.name}</option>
            ))}
          </select>
          <input
            className="rounded-md border-line text-sm dark:border-dark-line dark:bg-slate-950 dark:text-slate-100"
            placeholder="tipo do evento"
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
          />
          <button className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white">Filtrar</button>
        </form>
        {deliveries.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-3">Evento</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Endpoint</th>
                  <th className="pb-3 text-right">Latência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line dark:divide-dark-line">
                {deliveries.data.map((delivery) => (
                  <tr key={delivery.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900" onClick={() => setSelectedId(delivery.id)}>
                    <td className="py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{delivery.event.type}</td>
                    <td className="py-3"><StatusBadge status={delivery.status} /></td>
                    <td className="py-3 text-slate-700 dark:text-slate-300">{delivery.endpoint.name}</td>
                    <td className="py-3 text-right text-slate-700 dark:text-slate-300">{delivery.latencyMs ? `${delivery.latencyMs}ms` : "n/a"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Nenhuma delivery encontrada" detail="Ajuste os filtros ou envie um evento que corresponda a uma assinatura." />
        )}
      </Panel>
      <Panel
        title="Linha do tempo das tentativas"
        action={
          detail.data ? (
            <button
              className="rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              onClick={() => replay.mutate(detail.data.id)}
            >
              Reexecutar
            </button>
          ) : null
        }
      >
        {detail.data ? (
          <div>
            <div className="mb-5 rounded-md bg-slate-50 p-4 dark:bg-slate-900">
              <p className="font-mono text-xs text-slate-500">{detail.data.id}</p>
              <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">{detail.data.event.type}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{detail.data.endpoint.name}</p>
            </div>
            <div className="mb-5 grid grid-cols-3 rounded-md bg-slate-100 p-1 text-xs font-semibold dark:bg-slate-900">
              {[
                ["attempts", "Tentativas"],
                ["payload", "Payload"],
                ["response", "Resposta"]
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={detailTab === value ? "rounded bg-white px-2 py-2 text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white" : "px-2 py-2 text-slate-500 dark:text-slate-400"}
                  onClick={() => setDetailTab(value as typeof detailTab)}
                >
                  {label}
                </button>
              ))}
            </div>
            {detailTab === "attempts" ? (
              <ol className="space-y-4">
                {detail.data.attempts?.map((attempt, index) => (
                  <li key={attempt.id}>
                    <div className="rounded-lg border border-line bg-white p-4 dark:border-dark-line dark:bg-slate-950/40">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">Tentativa #{attempt.attemptNumber}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(attempt.timestamp).toLocaleString()}</p>
                      </div>
                      <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                        HTTP {attempt.responseStatus ?? "n/a"} · {attempt.latencyMs ?? attempt.durationMs}ms
                      </p>
                      {attempt.error ? <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{attempt.error}</p> : null}
                    </div>
                    {index < (detail.data.attempts?.length ?? 0) - 1 ? (
                      <div className="mx-6 py-2 text-xs font-semibold text-slate-400">↓ retry</div>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}
            {detailTab === "payload" ? (
              <pre className="code-scroll max-h-96 overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                {JSON.stringify(detail.data.event.payload ?? {}, null, 2)}
              </pre>
            ) : null}
            {detailTab === "response" ? (
              <pre className="code-scroll max-h-96 overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                {detail.data.attempts?.at(-1)?.responseBody ?? detail.data.lastError ?? "Sem resposta registrada."}
              </pre>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Selecione uma delivery para inspecionar as tentativas e reexecutar.</p>
        )}
      </Panel>
    </div>
  );
}
