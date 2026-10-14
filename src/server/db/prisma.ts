import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { isLocalDatabase } from "@/server/db/local-guard";

declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * One client per server instance, cached on the global in every environment
 * for the same reason src/lib/db.ts caches its pool: a deploy that evaluates
 * this module more than once would otherwise open a fresh set of connections
 * each time.
 *
 * `max: 3` while src/lib/db.ts still exists beside it, so the two pools
 * together hold no more connections than the old one did alone. Restored to
 * 5 when db.ts is removed.
 */
function createClient() {
  const connectionString = process.env.DATABASE_URL ?? "";
  const adapter = new PrismaPg({
    connectionString,
    // Railway is reached through a TLS proxy whose certificate cannot be
    // verified from here; a local Postgres usually has no TLS at all.
    ssl: isLocalDatabase(connectionString)
      ? false
      : { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

const prisma = global.prisma ?? createClient();
global.prisma = prisma;

export default prisma;
