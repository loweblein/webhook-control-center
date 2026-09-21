import { config } from "./config.js";
import { buildApp } from "./app.js";

const app = buildApp();

try {
  await app.listen({ host: "0.0.0.0", port: config.API_PORT });
} catch (error) {
  app.log.error(error, "falha ao iniciar api");
  process.exit(1);
}
