import type { FastifyInstance } from "fastify";
import { createWorkspaceSchema, prefixedId } from "@wcc/shared";
import { requireUser, requireWorkspace } from "../lib/auth.js";
import { parseBody } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";

export function registerWorkspaceRoutes(app: FastifyInstance): void {
  app.get("/workspaces", async (request) => {
    const user = requireUser(request);
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.sub },
      include: { workspace: true },
      orderBy: { createdAt: "asc" }
    });

    return memberships.map((membership) => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      role: membership.role
    }));
  });

  app.post("/workspaces", async (request, reply) => {
    const user = requireUser(request);
    const body = parseBody(createWorkspaceSchema, request.body);
    const workspace = await prisma.workspace.create({
      data: {
        id: prefixedId("wsp"),
        name: body.name,
        members: { create: { userId: user.sub, role: "OWNER" } }
      }
    });

    return reply.status(201).send(workspace);
  });

  app.get("/workspaces/current/members", async (request) => {
    const { workspaceId } = await requireWorkspace(request);
    return prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "asc" }
    });
  });
}
