import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  WEBHOOK_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

export const config = envSchema.parse(process.env);
