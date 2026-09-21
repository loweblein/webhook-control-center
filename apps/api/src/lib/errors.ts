import type { FastifyReply } from "fastify";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400
  ) {
    super(message);
  }
}

export function sendError(reply: FastifyReply, error: unknown, production: boolean): void {
  if (error instanceof AppError) {
    void reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message }
    });
    return;
  }

  if (error instanceof ZodError) {
    void reply.status(400).send({
      error: {
        code: "VALIDATION_ERROR",
        message: "Payload da requisição inválido",
        details: error.flatten()
      }
    });
    return;
  }

  if (isHttpError(error) && error.statusCode >= 400 && error.statusCode < 500) {
    void reply.status(error.statusCode).send({
      error: {
        code: error.code ?? "BAD_REQUEST",
        message: error.message
      }
    });
    return;
  }

  const message = production ? "Erro interno do servidor" : error instanceof Error ? error.message : "Erro desconhecido";
  void reply.status(500).send({ error: { code: "INTERNAL_SERVER_ERROR", message } });
}

function isHttpError(error: unknown): error is Error & { statusCode: number; code?: string } {
  return (
    error instanceof Error &&
    typeof (error as { statusCode?: unknown }).statusCode === "number"
  );
}
