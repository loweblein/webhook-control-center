import type { FastifyInstance } from "fastify";
import { requireWorkspace } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";

function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))] ?? 0;
}

export function registerMetricRoutes(app: FastifyInstance): void {
  app.get("/metrics/overview", async (request) => {
    const { workspaceId } = await requireWorkspace(request);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [deliveries, deliveriesToday, events24h, retryCount, endpointFailures] = await Promise.all([
      prisma.delivery.findMany({
        where: { workspaceId },
        select: { status: true, latencyMs: true, createdAt: true },
        orderBy: { createdAt: "asc" }
      }),
      prisma.delivery.count({ where: { workspaceId, createdAt: { gte: today } } }),
      prisma.event.count({ where: { workspaceId, createdAt: { gte: since24h } } }),
      prisma.deliveryAttempt.count({ where: { delivery: { workspaceId }, attemptNumber: { gt: 1 } } }),
      prisma.delivery.groupBy({
        by: ["endpointId"],
        where: { workspaceId, status: { in: ["FAILED", "DEAD"] } },
        _count: { endpointId: true },
        orderBy: { _count: { endpointId: "desc" } },
        take: 5
      })
    ]);

    const endpointIds = endpointFailures.map((row) => row.endpointId);
    const endpoints = endpointIds.length
      ? await prisma.webhookEndpoint.findMany({
          where: { id: { in: endpointIds }, workspaceId },
          select: { id: true, name: true }
        })
      : [];

    const latencies = deliveries
      .map((delivery) => delivery.latencyMs)
      .filter((latency): latency is number => typeof latency === "number");
    const successes = deliveries.filter((delivery) => delivery.status === "SUCCESS").length;
    const failures = deliveries.filter((delivery) => ["FAILED", "DEAD"].includes(delivery.status)).length;
    const successRate = deliveries.length ? Math.round((successes / deliveries.length) * 1000) / 10 : 0;

    const trend = deliveries.reduce<Record<string, { date: string; success: number; failed: number; total: number }>>(
      (acc, delivery) => {
        const date = delivery.createdAt.toISOString().slice(0, 10);
        acc[date] ??= { date, success: 0, failed: 0, total: 0 };
        acc[date].total += 1;
        if (delivery.status === "SUCCESS") {
          acc[date].success += 1;
        }
        if (["FAILED", "DEAD"].includes(delivery.status)) {
          acc[date].failed += 1;
        }
        return acc;
      },
      {}
    );

    return {
      totalDeliveries: deliveries.length,
      deliveriesToday,
      successRate,
      failures,
      averageLatency: latencies.length
        ? Math.round(latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length)
        : 0,
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
      retries: retryCount,
      eventsLast24h: events24h,
      trend: Object.values(trend).slice(-14),
      topFailingEndpoints: endpointFailures.map((row) => ({
        endpointId: row.endpointId,
        endpointName: endpoints.find((endpoint) => endpoint.id === row.endpointId)?.name ?? "Endpoint desconhecido",
        failures: row._count.endpointId
      }))
    };
  });

  app.get("/metrics/recent-deliveries", async (request) => {
    const { workspaceId } = await requireWorkspace(request);
    return prisma.delivery.findMany({
      where: { workspaceId },
      include: {
        event: { select: { id: true, type: true, createdAt: true } },
        endpoint: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 10
    });
  });
}
