import type { FastifyInstance } from "fastify";
import { deliveryFilterSchema } from "@wcc/shared";
import { requireWorkspace } from "../lib/auth.js";
import { AppError } from "../lib/errors.js";
import { parseQuery } from "../lib/http.js";
import { enqueueDelivery } from "../lib/queue.js";
import { prisma } from "../lib/prisma.js";

export function registerDeliveryRoutes(app: FastifyInstance): void {
  app.get("/deliveries", async (request) => {
    const { workspaceId } = await requireWorkspace(request);
    const filters = parseQuery(deliveryFilterSchema, request.query);
    const where = {
      workspaceId,
      status: filters.status,
      endpointId: filters.endpointId,
      event: filters.eventType ? { type: filters.eventType } : undefined,
      createdAt:
        filters.from || filters.to
          ? { gte: filters.from ? new Date(filters.from) : undefined, lte: filters.to ? new Date(filters.to) : undefined }
          : undefined
    };

    return prisma.delivery.findMany({
      where,
      include: {
        event: { select: { id: true, type: true, createdAt: true } },
        endpoint: { select: { id: true, name: true, url: true } },
        _count: { select: { attempts: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });
  });

  app.get("/deliveries/:id", async (request) => {
    const { workspaceId } = await requireWorkspace(request);
    const params = request.params as { id: string };
    const delivery = await prisma.delivery.findFirst({
      where: { id: params.id, workspaceId },
      include: {
        event: true,
        endpoint: { select: { id: true, name: true, url: true, active: true, createdAt: true, updatedAt: true } },
        attempts: { orderBy: { attemptNumber: "asc" } }
      }
    });

    if (!delivery) {
      throw new AppError("DELIVERY_NOT_FOUND", "Delivery não encontrada", 404);
    }

    return delivery;
  });

  app.post("/deliveries/:id/replay", async (request, reply) => {
    const { workspaceId } = await requireWorkspace(request);
    const params = request.params as { id: string };
    const delivery = await prisma.delivery.findFirst({
      where: { id: params.id, workspaceId },
      select: { id: true, status: true }
    });

    if (!delivery) {
      throw new AppError("DELIVERY_NOT_FOUND", "Delivery não encontrada", 404);
    }

    const updated = await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        status: "PENDING",
        attemptCount: 0,
        nextAttemptAt: new Date(),
        lastError: null,
        httpStatus: null,
        latencyMs: null,
        completedAt: null
      }
    });

    await enqueueDelivery(delivery.id);
    return reply.status(202).send(updated);
  });
}
