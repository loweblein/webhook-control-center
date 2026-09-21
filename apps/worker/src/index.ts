import { Worker } from "bullmq";
import { Queue } from "bullmq";
import { Redis } from "ioredis";
import pino from "pino";
import { config } from "./config.js";
import { processDelivery } from "./delivery.js";
import { prisma } from "./prisma.js";

const logger = pino({
  level: config.NODE_ENV === "production" ? "info" : "debug",
  redact: ["*.authorization", "*.secret", "*.signature"]
});

const connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
const deliveryQueue = new Queue<{ deliveryId: string }>("delivery", { connection });

const worker = new Worker<{ deliveryId: string }>(
  "delivery",
  async (job) => {
    logger.info({ deliveryId: job.data.deliveryId, jobId: job.id }, "processing delivery");
    await processDelivery({
      deliveryId: job.data.deliveryId,
      prisma,
      queue: deliveryQueue
    });
  },
  { connection, concurrency: 8 }
);

worker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, deliveryId: job?.data.deliveryId, error }, "delivery job failed");
});

worker.on("completed", (job) => {
  logger.info({ jobId: job.id, deliveryId: job.data.deliveryId }, "delivery job completed");
});

process.on("SIGTERM", () => {
  void (async () => {
    logger.info("worker shutting down");
    await worker.close();
    await deliveryQueue.close();
    await connection.quit();
    await prisma.$disconnect();
    process.exit(0);
  })();
});
