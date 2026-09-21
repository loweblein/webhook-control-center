import type { FastifyInstance } from "fastify";
import type { Prisma } from "@wcc/database";
import { createEndpointSchema, prefixedId, updateEndpointSchema } from "@wcc/shared";
import { requireWorkspace } from "../lib/auth.js";
import { AppError } from "../lib/errors.js";
import { parseBody } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { issueEndpointSecret } from "../lib/security.js";

const endpointSelect = {
  id: true,
  workspaceId: true,
  name: true,
  url: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  subscriptions: { select: { eventType: true }, orderBy: { eventType: "asc" } },
  _count: { select: { deliveries: true } }
} satisfies Prisma.WebhookEndpointSelect;

function endpointSelectForCreate() {
  return {
    ...endpointSelect,
    secret: true
  };
}

export function registerEndpointRoutes(app: FastifyInstance): void {
  app.get("/endpoints", async (request) => {
    const { workspaceId } = await requireWorkspace(request);
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { workspaceId },
      select: endpointSelect,
      orderBy: { createdAt: "desc" }
    });

    return endpoints.map((endpoint) => ({
      ...endpoint,
      eventTypes: endpoint.subscriptions.map((subscription) => subscription.eventType)
    }));
  });

  app.post("/endpoints", async (request, reply) => {
    const { workspaceId } = await requireWorkspace(request);
    const body = parseBody(createEndpointSchema, request.body);
    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        id: prefixedId("ep"),
        workspaceId,
        name: body.name,
        url: body.url,
        active: body.active,
        secret: issueEndpointSecret(),
        subscriptions: { create: body.eventTypes.map((eventType) => ({ eventType })) }
      },
      select: endpointSelectForCreate()
    });

    return reply.status(201).send({
      ...endpoint,
      eventTypes: endpoint.subscriptions.map((subscription) => subscription.eventType)
    });
  });

  app.get("/endpoints/:id", async (request) => {
    const { workspaceId } = await requireWorkspace(request);
    const params = request.params as { id: string };
    const endpoint = await prisma.webhookEndpoint.findFirst({
      where: { id: params.id, workspaceId },
      select: endpointSelect
    });

    if (!endpoint) {
      throw new AppError("ENDPOINT_NOT_FOUND", "Endpoint de webhook não encontrado", 404);
    }

    return {
      ...endpoint,
      eventTypes: endpoint.subscriptions.map((subscription) => subscription.eventType)
    };
  });

  app.put("/endpoints/:id", async (request) => {
    const { workspaceId } = await requireWorkspace(request);
    const params = request.params as { id: string };
    const body = parseBody(updateEndpointSchema, request.body);
    const existing = await prisma.webhookEndpoint.findFirst({
      where: { id: params.id, workspaceId }
    });

    if (!existing) {
      throw new AppError("ENDPOINT_NOT_FOUND", "Endpoint de webhook não encontrado", 404);
    }

    const endpoint = await prisma.$transaction(async (tx) => {
      if (body.eventTypes) {
        await tx.endpointSubscription.deleteMany({ where: { endpointId: existing.id } });
        await tx.endpointSubscription.createMany({
          data: body.eventTypes.map((eventType) => ({ endpointId: existing.id, eventType })),
          skipDuplicates: true
        });
      }

      return tx.webhookEndpoint.update({
        where: { id: existing.id },
        data: {
          name: body.name,
          url: body.url,
          active: body.active
        },
        select: endpointSelect
      });
    });

    return {
      ...endpoint,
      eventTypes: endpoint.subscriptions.map((subscription) => subscription.eventType)
    };
  });

  app.delete("/endpoints/:id", async (request, reply) => {
    const { workspaceId } = await requireWorkspace(request);
    const params = request.params as { id: string };
    const existing = await prisma.webhookEndpoint.findFirst({ where: { id: params.id, workspaceId } });

    if (!existing) {
      throw new AppError("ENDPOINT_NOT_FOUND", "Endpoint de webhook não encontrado", 404);
    }

    await prisma.webhookEndpoint.delete({ where: { id: existing.id } });
    return reply.status(204).send();
  });
}
