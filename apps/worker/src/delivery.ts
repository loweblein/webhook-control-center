import type { Prisma, PrismaClient } from "@wcc/database";
import { formatWebhookSignature, getRetryDelayMs, hasAttemptsRemaining, maxDeliveryAttempts, signWebhookPayload } from "@wcc/shared";
import type { Queue } from "bullmq";
import { prefixedId } from "@wcc/shared";
import { config } from "./config.js";
import { getFailureTransition } from "./retry-state.js";
import { assertSafeWebhookUrl } from "./ssrf.js";

const responseBodyLimit = 16_384;

type DeliveryQueue = Queue<{ deliveryId: string }>;

function truncateBody(body: string): string {
  return body.length > responseBodyLimit ? `${body.slice(0, responseBodyLimit)}...[truncated]` : body;
}

export async function processDelivery(params: {
  deliveryId: string;
  prisma: PrismaClient;
  queue: DeliveryQueue;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const fetcher = params.fetchImpl ?? fetch;
  const delivery = await params.prisma.delivery.findUnique({
    where: { id: params.deliveryId },
    include: { event: true, endpoint: true }
  });

  if (!delivery || delivery.status === "SUCCESS") {
    return;
  }

  const cycleAttemptNumber = delivery.attemptCount + 1;
  if (cycleAttemptNumber > maxDeliveryAttempts) {
    await params.prisma.delivery.update({
      where: { id: delivery.id },
      data: { status: "DEAD", lastError: "Retry budget exhausted" }
    });
    return;
  }

  const previousAttemptCount = await params.prisma.deliveryAttempt.count({
    where: { deliveryId: delivery.id }
  });
  const attemptNumber = previousAttemptCount + 1;

  await params.prisma.delivery.update({
    where: { id: delivery.id },
    data: { status: "PROCESSING", attemptCount: cycleAttemptNumber }
  });

  const payload = JSON.stringify({
    id: delivery.event.id,
    type: delivery.event.type,
    data: delivery.event.payload,
    createdAt: delivery.event.createdAt.toISOString()
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = formatWebhookSignature(
    signWebhookPayload({ secret: delivery.endpoint.secret, timestamp, payload })
  );
  const requestHeaders = {
    "content-type": "application/json",
    "x-webhook-id": delivery.id,
    "x-webhook-timestamp": String(timestamp),
    "x-webhook-signature": signature,
    "user-agent": "WebhookControlCenter/1.0"
  };
  const started = Date.now();
  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let errorMessage: string | null = null;

  try {
    await assertSafeWebhookUrl(delivery.endpoint.url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.WEBHOOK_TIMEOUT_MS);

    try {
      const response = await fetcher(delivery.endpoint.url, {
        method: "POST",
        headers: requestHeaders,
        body: payload,
        signal: controller.signal
      });
      responseStatus = response.status;
      responseBody = truncateBody(await response.text());
      if (!response.ok) {
        errorMessage = `Endpoint returned HTTP ${response.status}`;
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unknown delivery error";
  }

  const durationMs = Date.now() - started;
  const latencyMs = responseStatus ? durationMs : null;
  const success = responseStatus !== null && responseStatus >= 200 && responseStatus < 300;

  await params.prisma.$transaction(async (tx) => {
    await tx.deliveryAttempt.create({
      data: {
        id: prefixedId("atm"),
        deliveryId: delivery.id,
        attemptNumber,
        requestHeaders: requestHeaders satisfies Prisma.InputJsonValue,
        requestBody: JSON.parse(payload) as Prisma.InputJsonValue,
        responseStatus,
        responseBody,
        error: errorMessage,
        latencyMs,
        durationMs
      }
    });

    if (success) {
      await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          status: "SUCCESS",
          httpStatus: responseStatus,
          latencyMs,
          lastError: null,
          completedAt: new Date(),
          nextAttemptAt: null
        }
      });
      return;
    }

    const transition = getFailureTransition(cycleAttemptNumber);

    await tx.delivery.update({
      where: { id: delivery.id },
      data: {
        status: transition.status,
        httpStatus: responseStatus,
        latencyMs,
        lastError: errorMessage,
        nextAttemptAt: transition.nextAttemptAt
      }
    });
  });

  if (!success && hasAttemptsRemaining(cycleAttemptNumber)) {
    const delay = getRetryDelayMs(cycleAttemptNumber + 1) ?? 0;
    await params.queue.add(
      "deliver",
      { deliveryId: delivery.id },
      { jobId: `${delivery.id}-${cycleAttemptNumber + 1}-${Date.now()}`, delay }
    );
  }
}
