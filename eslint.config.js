import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "apps/api/prisma/migrations/**",
      "apps/web/dist/**",
      "apps/web/dist-types/**",
      "packages/database/generated/**",
      "eslint.config.js",
      "vitest.config.ts",
      "apps/web/vite.config.ts",
      "apps/web/tailwind.config.ts",
      "apps/web/postcss.config.js"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      },
      globals: {
        ...globals.node,
        ...globals.browser
      }
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-explicit-any": "error"
    }
  }
);
