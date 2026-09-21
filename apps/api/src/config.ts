import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

export const config = envSchema.parse(process.env);
