import type { Prisma } from "@wcc/database";
import type { FastifyInstance } from "fastify";
import { ingestEventSchema, prefixedId } from "@wcc/shared";
import { requireWorkspace } from "../lib/auth.js";
import { AppError } from "../lib/errors.js";
import { parseBody } from "../lib/http.js";
import { enqueueDelivery } from "../lib/queue.js";
import { prisma } from "../lib/prisma.js";
import { hashApiKey } from "../lib/security.js";

export function registerEventRoutes(app: FastifyInstance): void {
  app.post("/v1/events", async (request, reply) => {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      throw new AppError("UNAUTHORIZED", "API key obrigatória", 401);
    }

    const rawApiKey = authorization.slice("Bearer ".length);
    const apiKey = await prisma.apiKey.findFirst({
      where: { hash: hashApiKey(rawApiKey), revokedAt: null },
      include: { workspace: true }
    });

    if (!apiKey) {
      throw new AppError("INVALID_API_KEY", "API key inválida", 401);
    }

    const body = parseBody(ingestEventSchema, request.body);
    const deliveryIds: string[] = [];

    const event = await prisma.$transaction(async (tx) => {
      await tx.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
      const createdEvent = await tx.event.create({
        data: {
          id: prefixedId("evt"),
          workspaceId: apiKey.workspaceId,
          apiKeyId: apiKey.id,
          type: body.type,
          payload: body.data as Prisma.InputJsonValue
        }
      });

      const endpoints = await tx.webhookEndpoint.findMany({
        where: {
          workspaceId: apiKey.workspaceId,
          active: true,
          subscriptions: { some: { eventType: body.type } }
        },
        select: { id: true }
      });

      for (const endpoint of endpoints) {
        const id = prefixedId("dlv");
        deliveryIds.push(id);
        await tx.delivery.create({
          data: {
            id,
            workspaceId: apiKey.workspaceId,
            eventId: createdEvent.id,
            endpointId: endpoint.id,
            status: "PENDING",
            nextAttemptAt: new Date()
          }
        });
      }

      return createdEvent;
    });

    await Promise.all(deliveryIds.map((deliveryId) => enqueueDelivery(deliveryId)));

    request.log.info(
      { workspaceId: apiKey.workspaceId, eventId: event.id, deliveries: deliveryIds.length },
      "evento recebido"
    );

    return reply.status(202).send({
      id: event.id,
      type: event.type,
      status: "queued",
      deliveries: deliveryIds.length
    });
  });

  app.get("/events", async (request) => {
    const { workspaceId } = await requireWorkspace(request);
    const events = await prisma.event.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { deliveries: true } },
        deliveries: { select: { status: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return events.map((event) => ({
      id: event.id,
      type: event.type,
      payload: event.payload,
      createdAt: event.createdAt,
      deliveries: event._count.deliveries,
      successes: event.deliveries.filter((delivery) => delivery.status === "SUCCESS").length,
      failures: event.deliveries.filter((delivery) => ["FAILED", "DEAD"].includes(delivery.status)).length
    }));
  });

  app.get("/events/:id", async (request) => {
    const { workspaceId } = await requireWorkspace(request);
    const params = request.params as { id: string };
    const event = await prisma.event.findFirst({
      where: { id: params.id, workspaceId },
      include: {
        deliveries: {
          include: { endpoint: { select: { id: true, name: true, url: true } } },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!event) {
      throw new AppError("EVENT_NOT_FOUND", "Evento não encontrado", 404);
    }

    return event;
  });
}
