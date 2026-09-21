import { describe, expect, it } from "vitest";
import type { processDelivery as processDeliveryType } from "../delivery.js";

describe("delivery processing", () => {
  it("keeps attempt history unique while replay retry budget starts fresh", async () => {
    process.env.DATABASE_URL = "postgresql://wcc:wcc@localhost:5432/webhook_control_center";
    process.env.REDIS_URL = "redis://localhost:6379";

    const { processDelivery } = await import("../delivery.js");
    const deliveryUpdates: unknown[] = [];
    const attempts: unknown[] = [];
    const queuedJobs: unknown[] = [];

    const transactionClient = {
      deliveryAttempt: {
        create: (input: unknown) => {
          attempts.push(input);
          return Promise.resolve(input);
        }
      },
      delivery: {
        update: (input: unknown) => {
          deliveryUpdates.push(input);
          return Promise.resolve(input);
        }
      }
    };

    const prisma = {
      delivery: {
        findUnique: () =>
          Promise.resolve({
            id: "dlv_replayed",
            status: "PENDING",
            attemptCount: 0,
            event: {
              id: "evt_replayed",
              type: "payment.completed",
              payload: { amount: 4990 },
              createdAt: new Date("2026-09-20T12:00:00.000Z")
            },
            endpoint: {
              secret: "whsec_test",
              url: "http://8.8.8.8/webhooks"
            }
          }),
        update: (input: unknown) => {
          deliveryUpdates.push(input);
          return Promise.resolve(input);
        }
      },
      deliveryAttempt: {
        count: () => Promise.resolve(5)
      },
      $transaction: <T>(handler: (tx: typeof transactionClient) => Promise<T>) => handler(transactionClient)
    } as unknown as Parameters<typeof processDeliveryType>[0]["prisma"];

    const queue = {
      add: (...args: unknown[]) => {
        queuedJobs.push(args);
        return Promise.resolve();
      }
    } as unknown as Parameters<typeof processDeliveryType>[0]["queue"];

    await processDelivery({
      deliveryId: "dlv_replayed",
      prisma,
      queue,
      fetchImpl: () => Promise.resolve(new Response("nope", { status: 500 }))
    });

    expect(deliveryUpdates).toContainEqual({
      where: { id: "dlv_replayed" },
      data: { status: "PROCESSING", attemptCount: 1 }
    });
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      data: {
        deliveryId: "dlv_replayed",
        attemptNumber: 6,
        responseStatus: 500
      }
    });
    const queuedJob = queuedJobs[0] as [string, { deliveryId: string }, { delay: number; jobId: string }];
    expect(queuedJob[0]).toBe("deliver");
    expect(queuedJob[1]).toEqual({ deliveryId: "dlv_replayed" });
    expect(queuedJob[2].delay).toBe(10_000);
  });
});
