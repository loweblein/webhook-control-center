import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { config } from "../config.js";

export type DeliveryJob = {
  deliveryId: string;
};

export const redisConnection = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: null
});

export const deliveryQueue = new Queue<DeliveryJob>("delivery", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 5000
  }
});

export async function enqueueDelivery(deliveryId: string, delay = 0): Promise<void> {
  await deliveryQueue.add("deliver", { deliveryId }, { jobId: `${deliveryId}-${Date.now()}`, delay });
}
