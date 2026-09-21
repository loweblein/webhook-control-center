import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import fastify from "fastify";
import { config } from "./config.js";
import { sendError } from "./lib/errors.js";
import { registerHealth } from "./lib/http.js";
import { registerApiKeyRoutes } from "./routes/api-keys.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerDeliveryRoutes } from "./routes/deliveries.js";
import { registerEndpointRoutes } from "./routes/endpoints.js";
import { registerEventRoutes } from "./routes/events.js";
import { registerMetricRoutes } from "./routes/metrics.js";
import { registerWorkspaceRoutes } from "./routes/workspaces.js";

export function buildApp() {
  const app = fastify({
    logger: {
      level: config.NODE_ENV === "production" ? "info" : "debug",
      redact: ["req.headers.authorization", "password", "key", "*.secret", "*.hash"]
    },
    bodyLimit: 1024 * 1024,
    genReqId: () => crypto.randomUUID()
  });

  app.setErrorHandler((error, _request, reply) => {
    sendError(reply, error, config.NODE_ENV === "production");
  });

  void app.register(helmet);
  void app.register(cors, {
    origin: [config.WEB_ORIGIN],
    credentials: true
  });
  void app.register(rateLimit, {
    max: 180,
    timeWindow: "1 minute"
  });
  void app.register(swagger, {
    openapi: {
      info: {
        title: "Webhook Control Center API",
        version: "1.0.0",
        description: "Gerencie endpoints de webhook, receba eventos, reexecute deliveries e inspecione tentativas."
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer" },
          apiKeyBearer: { type: "http", scheme: "bearer" }
        }
      }
    }
  });
  void app.register(swaggerUi, { routePrefix: "/docs" });

  registerHealth(app);
  registerAuthRoutes(app);
  registerWorkspaceRoutes(app);
  registerApiKeyRoutes(app);
  registerEndpointRoutes(app);
  registerEventRoutes(app);
  registerDeliveryRoutes(app);
  registerMetricRoutes(app);

  return app;
}
