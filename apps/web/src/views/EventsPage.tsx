import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api.js";
import type { EventRow } from "../types.js";
import { EmptyState } from "../ui/EmptyState.js";
import { Panel } from "../ui/Panel.js";

export function EventsPage() {
  const [selected, setSelected] = useState<EventRow | null>(null);
  const events = useQuery({ queryKey: ["events"], queryFn: () => api<EventRow[]>("/events") });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Panel title="Eventos">
        {events.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="pb-3">ID</th>
                  <th className="pb-3">Tipo</th>
                  <th className="pb-3">Criado em</th>
                  <th className="pb-3 text-right">Entregas</th>
                  <th className="pb-3 text-right">Sucessos</th>
                  <th className="pb-3 text-right">Falhas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line dark:divide-dark-line">
                {events.data.map((event) => (
                  <tr
                    key={event.id}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900"
                    onClick={() => setSelected(event)}
                  >
                    <td className="py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{event.id}</td>
                    <td className="py-3 font-medium text-slate-900 dark:text-slate-100">{event.type}</td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">{new Date(event.createdAt).toLocaleString()}</td>
                    <td className="py-3 text-right">{event.deliveries}</td>
                    <td className="py-3 text-right text-emerald-700">{event.successes}</td>
                    <td className="py-3 text-right text-rose-700">{event.failures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Nenhum evento ainda" detail="Envie um POST /v1/events com uma API key para popular esta tabela." />
        )}
      </Panel>
      <Panel title="Payload">
        {selected ? (
          <pre className="code-scroll max-h-[640px] overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-6 text-slate-100">
            {JSON.stringify(selected.payload, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Selecione um evento para inspecionar o payload JSON.</p>
        )}
      </Panel>
    </div>
  );
}
