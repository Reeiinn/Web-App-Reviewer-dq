import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The app imports through the "@/..." alias, so the tests resolve it the same
// way tsconfig does.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
