import { PrismaClient } from "@wcc/database";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
});
