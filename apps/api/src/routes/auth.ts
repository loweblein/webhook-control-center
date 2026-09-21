import type { FastifyInstance } from "fastify";
import { prefixedId, loginSchema, registerSchema } from "@wcc/shared";
import { parseBody } from "../lib/http.js";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { hashPassword, verifyPassword } from "../lib/security.js";
import { requireUser, signJwt } from "../lib/auth.js";

function publicUser(user: { id: string; email: string; name: string }) {
  return { id: user.id, email: user.email, name: user.name };
}

export function registerAuthRoutes(app: FastifyInstance): void {
  app.post("/auth/register", async (request, reply) => {
    const body = parseBody(registerSchema, request.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });

    if (existing) {
      throw new AppError("EMAIL_ALREADY_REGISTERED", "Este email já está cadastrado", 409);
    }

    const passwordHash = await hashPassword(body.password);
    const workspaceId = prefixedId("wsp");

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: body.email, name: body.name, passwordHash }
      });
      const workspace = await tx.workspace.create({
        data: { id: workspaceId, name: body.workspaceName ?? "Meu Workspace" }
      });
      await tx.workspaceMember.create({
        data: { userId: user.id, workspaceId: workspace.id, role: "OWNER" }
      });
      return { user, workspace };
    });

    const token = signJwt({
      sub: result.user.id,
      email: result.user.email,
      currentWorkspaceId: result.workspace.id
    });

    return reply.status(201).send({
      token,
      user: publicUser(result.user),
      workspaces: [{ ...result.workspace, role: "OWNER" }]
    });
  });

  app.post("/auth/login", async (request) => {
    const body = parseBody(loginSchema, request.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { memberships: { include: { workspace: true }, orderBy: { createdAt: "asc" } } }
    });

    if (!user || !(await verifyPassword(user.passwordHash, body.password))) {
      throw new AppError("INVALID_CREDENTIALS", "Email ou senha inválidos", 401);
    }

    const currentWorkspace = user.memberships[0]?.workspace;
    const token = signJwt({
      sub: user.id,
      email: user.email,
      currentWorkspaceId: currentWorkspace?.id
    });

    return {
      token,
      user: publicUser(user),
      workspaces: user.memberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        role: membership.role
      }))
    };
  });

  app.get("/auth/me", async (request) => {
    const jwt = requireUser(request);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: jwt.sub },
      include: { memberships: { include: { workspace: true } } }
    });

    return {
      user: publicUser(user),
      workspaces: user.memberships.map((membership) => ({
        id: membership.workspace.id,
        name: membership.workspace.name,
        role: membership.role
      }))
    };
  });
}
