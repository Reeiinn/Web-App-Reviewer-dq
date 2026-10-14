import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { assertLocalDatabase } from "./src/server/db/local-guard";

// Only .env.local, never .env: the database URLs for this tooling live there.
config({ path: ".env.local" });

/**
 * The CLI reads MIGRATE_DATABASE_URL and nothing else, so a migrate or reset
 * can never pick up the app's DATABASE_URL by accident. A non-local host is
 * refused unless ALLOW_REMOTE_MIGRATE=1, which is set by hand for the
 * production checklist and nowhere else. `prisma generate` needs no URL, so
 * a missing one is allowed: the build still generates the client.
 */
const url = process.env.MIGRATE_DATABASE_URL;
if (url) {
  assertLocalDatabase(url, {
    allowRemote: process.env.ALLOW_REMOTE_MIGRATE === "1",
  });
}

// Scratch database Prisma rebuilds from prisma/migrations when it diffs or
// generates a migration. Always local: it is wiped every time.
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;
if (shadowDatabaseUrl) {
  assertLocalDatabase(shadowDatabaseUrl);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  ...(url
    ? { datasource: { url, ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}) } }
    : {}),
});
