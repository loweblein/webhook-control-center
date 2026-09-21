import type { FastifyInstance } from "fastify";
import { createApiKeySchema, prefixedId } from "@wcc/shared";
import { requireWorkspace } from "../lib/auth.js";
import { AppError } from "../lib/errors.js";
import { parseBody } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { issueApiKey } from "../lib/security.js";

export function registerApiKeyRoutes(app: FastifyInstance): void {
  app.get("/api-keys", async (request) => {
    const { workspaceId } = await requireWorkspace(request);
    return prisma.apiKey.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        prefix: true,
        createdAt: true,
        revokedAt: true,
        lastUsedAt: true
      },
      orderBy: { createdAt: "desc" }
    });
  });

  app.post("/api-keys", async (request, reply) => {
    const { workspaceId } = await requireWorkspace(request);
    const body = parseBody(createApiKeySchema, request.body);
    const issued = issueApiKey();
    const apiKey = await prisma.apiKey.create({
      data: {
        id: prefixedId("key"),
        workspaceId,
        name: body.name,
        prefix: issued.prefix,
        hash: issued.hash
      },
      select: { id: true, name: true, prefix: true, createdAt: true, revokedAt: true }
    });

    return reply.status(201).send({ ...apiKey, key: issued.key });
  });

  app.post("/api-keys/:id/revoke", async (request) => {
    const { workspaceId } = await requireWorkspace(request);
    const params = request.params as { id: string };
    const existing = await prisma.apiKey.findFirst({
      where: { id: params.id, workspaceId, revokedAt: null }
    });

    if (!existing) {
      throw new AppError("API_KEY_NOT_FOUND", "API key não encontrada", 404);
    }

    return prisma.apiKey.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
      select: { id: true, name: true, prefix: true, createdAt: true, revokedAt: true, lastUsedAt: true }
    });
  });
}
