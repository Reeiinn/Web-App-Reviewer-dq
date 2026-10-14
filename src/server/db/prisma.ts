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
 * `max: 3` while src/lib/db.ts (max 2) still exists beside it, so the two
 * pools together hold no more than the old pool's 5. Since Wave 2 the
 * study routes, the bulk of the traffic, and every session refresh read
 * through this client, so it holds the larger share. Restored to 5 when
 * db.ts is removed.
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
    // The pg adapter drops the offset Postgres sends with a timestamptz, and
    // sends instants without one, so on a server whose time zone is not UTC
    // every timestamp read or written through Prisma is off by that zone.
    // Pinning the session to UTC makes the offset zero and the bug moot.
    options: "-c TimeZone=UTC",
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

const prisma = global.prisma ?? createClient();
global.prisma = prisma;

export default prisma;
