import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api.js";
import { Panel } from "../ui/Panel.js";
import { StatusBadge } from "../ui/StatusBadge.js";
import { useTheme } from "../ui/ThemeProvider.js";
import type { Delivery, OverviewMetrics } from "../types.js";

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel dark:shadow-soft-dark">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-950 dark:text-slate-50">{value}</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
    </div>
  );
}

export function OverviewPage() {
  const { theme } = useTheme();
  const metrics = useQuery({
    queryKey: ["metrics"],
    queryFn: () => api<OverviewMetrics>("/metrics/overview")
  });
  const recent = useQuery({
    queryKey: ["recent-deliveries"],
    queryFn: () => api<Delivery[]>("/metrics/recent-deliveries")
  });

  if (metrics.isLoading) {
    return <div className="h-96 animate-pulse rounded-lg bg-white dark:bg-dark-panel" />;
  }

  const data = metrics.data;
  const chartGrid = theme === "dark" ? "#334155" : "#e2e8f0";
  const chartText = theme === "dark" ? "#94a3b8" : "#64748b";
  const tooltipStyle = {
    backgroundColor: theme === "dark" ? "#101826" : "#ffffff",
    borderColor: theme === "dark" ? "#253044" : "#d9e2ea",
    color: theme === "dark" ? "#e5e7eb" : "#111827"
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Deliveries hoje" value={String(data?.deliveriesToday ?? 0)} detail={`${data?.eventsLast24h ?? 0} eventos em 24h`} />
        <MetricCard label="Taxa de sucesso" value={`${data?.successRate ?? 0}%`} detail={`${data?.totalDeliveries ?? 0} deliveries no total`} />
        <MetricCard label="Falhas" value={String(data?.failures ?? 0)} detail={`${data?.retries ?? 0} tentativas de retry`} />
        <MetricCard label="Latência média" value={`${data?.averageLatency ?? 0}ms`} detail={`P95 ${data?.p95 ?? 0}ms, P99 ${data?.p99 ?? 0}ms`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <Panel title="Deliveries ao longo do tempo">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.trend ?? []}>
                <defs>
                  <linearGradient id="success" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#047857" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#047857" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="failed" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#be123c" stopOpacity={0.26} />
                    <stop offset="95%" stopColor="#be123c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartGrid} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke={chartText} />
                <YAxis tick={{ fontSize: 12 }} stroke={chartText} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="success" name="Sucesso" stroke="#047857" fill="url(#success)" strokeWidth={2} />
                <Area type="monotone" dataKey="failed" name="Falha" stroke="#be123c" fill="url(#failed)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Percentis de latência">
          <div className="grid grid-cols-3 gap-3">
            {[
              ["P50", data?.p50 ?? 0],
              ["P95", data?.p95 ?? 0],
              ["P99", data?.p99 ?? 0]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md bg-slate-50 p-4 dark:bg-slate-900">
                <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{value}ms</p>
              </div>
            ))}
          </div>
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Endpoints com erros</h3>
            {data?.topFailingEndpoints.length ? (
              data.topFailingEndpoints.map((endpoint) => (
                <div key={endpoint.endpointId} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-900">
                  <span className="text-sm text-slate-700 dark:text-slate-300">{endpoint.endpointName}</span>
                  <span className="text-sm font-semibold text-rose-700">{endpoint.failures}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum endpoint com falha no conjunto atual.</p>
            )}
          </div>
        </Panel>
      </div>

      <Panel title="Entregas recentes">
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
              {recent.data?.map((delivery) => (
                <tr key={delivery.id}>
                  <td className="py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{delivery.event.type}</td>
                  <td className="py-3"><StatusBadge status={delivery.status} /></td>
                  <td className="py-3 text-slate-700 dark:text-slate-300">{delivery.endpoint.name}</td>
                  <td className="py-3 text-right text-slate-700 dark:text-slate-300">{delivery.latencyMs ? `${delivery.latencyMs}ms` : "n/a"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
