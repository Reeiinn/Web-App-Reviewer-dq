import { execSync } from "node:child_process";
import { Client } from "pg";
import { loadEnv } from "vite";
import {
  assertLocalDatabase,
  sameLocalDatabase,
} from "../server/db/local-guard";

/**
 * Rebuilds the test database from prisma/migrations before the db project
 * runs, so every run starts empty and proves the migrations replay cleanly.
 *
 * It drops everything in the test database's public schema, so it refuses
 * anything but a local database, and refuses outright when the test database
 * is the same one the app or the Prisma CLI point at.
 */
export default async function setup() {
  const env = loadEnv("test", process.cwd(), "");
  const url = assertLocalDatabase(env.TEST_DATABASE_URL);
  for (const other of [env.DATABASE_URL, env.MIGRATE_DATABASE_URL]) {
    if (other && sameLocalDatabase(other, url)) {
      throw new Error(
        "TEST_DATABASE_URL names the same database as DATABASE_URL or MIGRATE_DATABASE_URL; refusing to wipe it.",
      );
    }
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("DROP SCHEMA public CASCADE");
    await client.query("CREATE SCHEMA public");
  } finally {
    await client.end();
  }

  // `migrate deploy` needs no shadow database, and the configured one is
  // this same test database, which Prisma refuses. An empty value keeps
  // .env.local's from being loaded.
  execSync("pnpm exec prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, MIGRATE_DATABASE_URL: url, SHADOW_DATABASE_URL: "" },
  });
}
