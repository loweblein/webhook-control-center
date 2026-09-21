import { PrismaClient, type DeliveryStatus } from "@wcc/database";
import { prefixedId } from "@wcc/shared";
import { hashPassword, issueApiKey, issueEndpointSecret } from "../src/lib/security.js";

const prisma = new PrismaClient();
const demoEmail = "demo@example.com";

const demoEvents = [
  { type: "payment.completed", data: { customerId: "cus_123", amount: 4990, currency: "BRL" } },
  { type: "user.created", data: { userId: "usr_928", email: "ana@example.com" } },
  { type: "invoice.failed", data: { invoiceId: "inv_481", reason: "insufficient_funds" } },
  { type: "subscription.deleted", data: { subscriptionId: "sub_202", canceledAt: new Date().toISOString() } }
] as const;

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length] as T;
}

async function main() {
  const existingDemoUser = await prisma.user.findUnique({
    where: { email: demoEmail },
    include: { memberships: { select: { workspaceId: true } } }
  });

  if (existingDemoUser) {
    const workspaceIds = existingDemoUser.memberships.map((membership) => membership.workspaceId);
    await prisma.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
    await prisma.user.delete({ where: { id: existingDemoUser.id } });
  }

  const workspaceId = prefixedId("wsp");
  const user = await prisma.user.create({
    data: {
      email: demoEmail,
      name: "Usuário Demo",
      passwordHash: await hashPassword("password123")
    }
  });

  const workspace = await prisma.workspace.create({
    data: {
      id: workspaceId,
      name: "Acme Inc.",
      members: { create: { userId: user.id, role: "OWNER" } }
    }
  });

  const issuedKey = issueApiKey();
  await prisma.apiKey.create({
    data: {
      id: prefixedId("key"),
      workspaceId: workspace.id,
      name: "Produção",
      prefix: issuedKey.prefix,
      hash: issuedKey.hash,
      lastUsedAt: new Date()
    }
  });

  const endpointInputs = [
    {
      name: "payments",
      url: "https://example.com/webhooks/payments",
      eventTypes: ["payment.completed", "invoice.failed"]
    },
    {
      name: "crm",
      url: "https://example.com/webhooks/crm",
      eventTypes: ["user.created", "subscription.deleted"]
    },
    {
      name: "accounting",
      url: "https://example.com/webhooks/accounting",
      eventTypes: ["payment.completed", "invoice.failed"]
    }
  ];

  const endpoints = [];
  for (const endpoint of endpointInputs) {
    endpoints.push(
      await prisma.webhookEndpoint.create({
        data: {
          id: prefixedId("ep"),
          workspaceId: workspace.id,
          name: endpoint.name,
          url: endpoint.url,
          active: true,
          secret: issueEndpointSecret(),
          subscriptions: { create: endpoint.eventTypes.map((eventType) => ({ eventType })) }
        }
      })
    );
  }

  for (let index = 0; index < 36; index += 1) {
    const eventInput = pick(demoEvents, index);
    const createdAt = new Date(Date.now() - (36 - index) * 55 * 60 * 1000);
    const event = await prisma.event.create({
      data: {
        id: prefixedId("evt"),
        workspaceId: workspace.id,
        type: eventInput.type,
        payload: { ...eventInput.data, sequence: index + 1 },
        createdAt
      }
    });

    const matchingEndpoints = endpoints.filter((endpoint) =>
      endpointInputs
        .find((input) => input.name === endpoint.name)
        ?.eventTypes.includes(eventInput.type)
    );

    for (const endpoint of matchingEndpoints) {
      const shouldFail = endpoint.name === "accounting" && index % 5 === 0;
      const shouldRetryThenSucceed = endpoint.name === "payments" && index % 7 === 0;
      const status: DeliveryStatus = shouldFail ? "DEAD" : "SUCCESS";
      const delivery = await prisma.delivery.create({
        data: {
          id: prefixedId("dlv"),
          workspaceId: workspace.id,
          eventId: event.id,
          endpointId: endpoint.id,
          status,
          attemptCount: shouldFail ? 5 : shouldRetryThenSucceed ? 2 : 1,
          httpStatus: status === "SUCCESS" ? 200 : 500,
          latencyMs: status === "SUCCESS" ? 70 + ((index * 17) % 180) : 420 + ((index * 31) % 600),
          lastError: status === "DEAD" ? "Endpoint retornou HTTP 500" : null,
          completedAt: status === "SUCCESS" ? new Date(createdAt.getTime() + 3000) : null,
          createdAt
        }
      });

      const attempts = shouldFail ? 5 : shouldRetryThenSucceed ? 2 : 1;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const attemptSuccess = status === "SUCCESS" && attempt === attempts;
        await prisma.deliveryAttempt.create({
          data: {
            id: prefixedId("atm"),
            deliveryId: delivery.id,
            attemptNumber: attempt,
            timestamp: new Date(createdAt.getTime() + attempt * 10_000),
            requestHeaders: { "content-type": "application/json" },
            requestBody: { id: event.id, type: event.type, data: event.payload },
            responseStatus: attemptSuccess ? 200 : 500,
            responseBody: attemptSuccess ? "{\"recebido\":true}" : "{\"erro\":\"instabilidade temporaria\"}",
            error: attemptSuccess ? null : "Endpoint retornou HTTP 500",
            latencyMs: attemptSuccess ? delivery.latencyMs : 350 + attempt * 40,
            durationMs: attemptSuccess ? delivery.latencyMs ?? 100 : 350 + attempt * 40
          }
        });
      }
    }
  }

  console.log("Seed concluído");
  console.log("Login: demo@example.com / password123");
  console.log(`API key demo exibida somente na saída do seed: ${issuedKey.key}`);
}

await main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
