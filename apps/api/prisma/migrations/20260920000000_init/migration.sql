CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'MEMBER');
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'DEAD');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Workspace" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceMember" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiKey" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookEndpoint" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EndpointSubscription" (
  "id" TEXT NOT NULL,
  "endpointId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  CONSTRAINT "EndpointSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Event" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "apiKeyId" TEXT,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Delivery" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "endpointId" TEXT NOT NULL,
  "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "lastError" TEXT,
  "httpStatus" INTEGER,
  "latencyMs" INTEGER,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeliveryAttempt" (
  "id" TEXT NOT NULL,
  "deliveryId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requestHeaders" JSONB NOT NULL,
  "requestBody" JSONB NOT NULL,
  "responseStatus" INTEGER,
  "responseBody" TEXT,
  "error" TEXT,
  "latencyMs" INTEGER,
  "durationMs" INTEGER NOT NULL,
  CONSTRAINT "DeliveryAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "WorkspaceMember_userId_workspaceId_key" ON "WorkspaceMember"("userId", "workspaceId");
CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");
CREATE UNIQUE INDEX "ApiKey_hash_key" ON "ApiKey"("hash");
CREATE INDEX "ApiKey_workspaceId_idx" ON "ApiKey"("workspaceId");
CREATE INDEX "ApiKey_prefix_idx" ON "ApiKey"("prefix");
CREATE INDEX "WebhookEndpoint_workspaceId_idx" ON "WebhookEndpoint"("workspaceId");
CREATE INDEX "WebhookEndpoint_workspaceId_active_idx" ON "WebhookEndpoint"("workspaceId", "active");
CREATE UNIQUE INDEX "EndpointSubscription_endpointId_eventType_key" ON "EndpointSubscription"("endpointId", "eventType");
CREATE INDEX "EndpointSubscription_eventType_idx" ON "EndpointSubscription"("eventType");
CREATE INDEX "Event_workspaceId_createdAt_idx" ON "Event"("workspaceId", "createdAt");
CREATE INDEX "Event_workspaceId_type_idx" ON "Event"("workspaceId", "type");
CREATE UNIQUE INDEX "Delivery_eventId_endpointId_key" ON "Delivery"("eventId", "endpointId");
CREATE INDEX "Delivery_workspaceId_status_createdAt_idx" ON "Delivery"("workspaceId", "status", "createdAt");
CREATE INDEX "Delivery_endpointId_createdAt_idx" ON "Delivery"("endpointId", "createdAt");
CREATE UNIQUE INDEX "DeliveryAttempt_deliveryId_attemptNumber_key" ON "DeliveryAttempt"("deliveryId", "attemptNumber");
CREATE INDEX "DeliveryAttempt_deliveryId_timestamp_idx" ON "DeliveryAttempt"("deliveryId", "timestamp");

ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EndpointSubscription" ADD CONSTRAINT "EndpointSubscription_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryAttempt" ADD CONSTRAINT "DeliveryAttempt_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
