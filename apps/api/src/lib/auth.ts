import jwt from "jsonwebtoken";
import type { FastifyRequest } from "fastify";
import { config } from "../config.js";
import { AppError } from "./errors.js";
import { prisma } from "./prisma.js";

export type JwtPayload = {
  sub: string;
  email: string;
  currentWorkspaceId?: string;
};

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_SECRET) as JwtPayload;
}

export function requireUser(request: FastifyRequest): JwtPayload {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    throw new AppError("UNAUTHORIZED", "Autenticação obrigatória", 401);
  }

  try {
    return verifyJwt(authorization.slice("Bearer ".length));
  } catch {
    throw new AppError("UNAUTHORIZED", "Token inválido ou expirado", 401);
  }
}

export async function requireWorkspace(request: FastifyRequest): Promise<{ userId: string; workspaceId: string }> {
  const user = requireUser(request);
  const workspaceId = request.headers["x-workspace-id"];
  const resolvedWorkspaceId =
    typeof workspaceId === "string" && workspaceId.length > 0
      ? workspaceId
      : user.currentWorkspaceId;

  if (!resolvedWorkspaceId) {
    throw new AppError("WORKSPACE_REQUIRED", "Contexto de workspace obrigatório", 400);
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: user.sub, workspaceId: resolvedWorkspaceId } }
  });

  if (!membership) {
    throw new AppError("FORBIDDEN", "Você não tem acesso a este workspace", 403);
  }

  return { userId: user.sub, workspaceId: resolvedWorkspaceId };
}
