import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { isLocalDatabase } from "@/server/db/local-guard";

declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * One client per server instance, cached on the global in every environment.
 * This module is evaluated once per module graph, and a deploy that loads it
 * more than once — a serverless function per route, a dev server rebuilding
 * on save — would otherwise open a fresh set of connections each time and
 * leave the old ones idle against the database's own connection limit.
 *
 * `max` is kept small for the same reason: Postgres counts connections per
 * server, not per app, so a handful of instances at the pg default of 10
 * each is enough to exhaust a managed database's limit. This is the app's
 * only pool, so it holds the 5 the old pg pool did.
 */
export const POOL_MAX = 5;

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
    max: POOL_MAX,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

const prisma = global.prisma ?? createClient();
global.prisma = prisma;

export default prisma;
