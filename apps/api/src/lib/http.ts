import type { FastifyInstance } from "fastify";
import type { z } from "zod";

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  return schema.parse(body);
}

export function parseQuery<T>(schema: z.ZodType<T>, query: unknown): T {
  return schema.parse(query);
}

export function registerHealth(app: FastifyInstance): void {
  app.get("/health", () => ({ ok: true }));
}
