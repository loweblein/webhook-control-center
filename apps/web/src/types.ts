export type Workspace = { id: string; name: string; role: "OWNER" | "MEMBER" };

export type Endpoint = {
  id: string;
  name: string;
  url: string;
  secret: string;
  active: boolean;
  eventTypes: string[];
  createdAt: string;
  _count?: { deliveries: number };
};

export type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt?: string | null;
  key?: string;
};

export type EventRow = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
  deliveries: number;
  successes: number;
  failures: number;
};

export type Delivery = {
  id: string;
  status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "DEAD";
  latencyMs: number | null;
  httpStatus: number | null;
  attemptCount: number;
  createdAt: string;
  lastError?: string | null;
  event: { id: string; type: string; payload?: unknown; createdAt: string };
  endpoint: { id: string; name: string; url?: string };
  attempts?: DeliveryAttempt[];
};

export type DeliveryAttempt = {
  id: string;
  attemptNumber: number;
  timestamp: string;
  responseStatus: number | null;
  responseBody: string | null;
  error: string | null;
  latencyMs: number | null;
  durationMs: number;
};

export type OverviewMetrics = {
  totalDeliveries: number;
  deliveriesToday: number;
  successRate: number;
  failures: number;
  averageLatency: number;
  p50: number;
  p95: number;
  p99: number;
  retries: number;
  eventsLast24h: number;
  trend: Array<{ date: string; success: number; failed: number; total: number }>;
  topFailingEndpoints: Array<{ endpointId: string; endpointName: string; failures: number }>;
};
