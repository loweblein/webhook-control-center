import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    environment: "node"
  },
  resolve: {
    alias: {
      "@wcc/shared": fileURLToPath(new URL("./packages/shared/src/index.ts", import.meta.url)),
      "@wcc/shared/": fileURLToPath(new URL("./packages/shared/src/", import.meta.url))
    }
  }
});
