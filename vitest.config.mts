import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// TEST_DATABASE_URL comes from .env.local. It is the only variable read here:
// the db project points DATABASE_URL at it so data modules under test never
// see another database.
const testDatabaseUrl = loadEnv("test", process.cwd(), "").TEST_DATABASE_URL;

export default defineConfig({
  // The app imports through the "@/..." alias, so the tests resolve it the
  // same way tsconfig does.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./src/test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/**/*.db.test.ts", "node_modules/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          include: ["src/**/*.db.test.ts"],
          globalSetup: ["./src/test/db-global-setup.ts"],
          setupFiles: ["./src/test/db-setup.ts"],
          fileParallelism: false,
          env: testDatabaseUrl ? { DATABASE_URL: testDatabaseUrl } : {},
        },
      },
    ],
  },
});
