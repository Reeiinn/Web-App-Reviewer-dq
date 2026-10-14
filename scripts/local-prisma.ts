import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { loadLocalEnv } from "../src/server/db/local-env";
import { assertLocalDatabase } from "../src/server/db/local-guard";

/**
 * A Prisma client for the seed scripts, on MIGRATE_DATABASE_URL from
 * .env.local, the same variable the Prisma CLI reads.
 *
 * These scripts write made-up progress into an account, so they refuse
 * anything but a local database. There is no ALLOW_REMOTE_MIGRATE escape
 * here: seeded sittings and certificates have no business in production.
 * Sessions are pinned to UTC for the reason src/server/db/prisma.ts gives.
 */
export function localPrisma(): PrismaClient {
  loadLocalEnv();
  const url = assertLocalDatabase(process.env.MIGRATE_DATABASE_URL);
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url, options: "-c TimeZone=UTC" }),
  });
}
