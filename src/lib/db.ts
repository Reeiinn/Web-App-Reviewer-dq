import { Pool } from "pg";

declare global {
  var pgPool: Pool | undefined;
}

/**
 * One pool per server instance, reused across requests.
 *
 * The pool is cached on the global in every environment, not only in
 * development. The reason is the same in both: this module is evaluated once
 * per module graph, and a deploy that loads it more than once — a serverless
 * function per route, a dev server rebuilding on save — would otherwise open a
 * fresh set of connections each time and leave the old ones idle against the
 * database's own connection limit.
 *
 * `max` is deliberately small for the same reason. Postgres counts connections
 * per server, not per app, so a handful of instances at the pg default of 10
 * each is enough to exhaust a managed database's limit while every one of them
 * sits mostly idle. Queries here are short reads and single-row writes, so a
 * small pool with a queue behind it serves them without holding connections
 * open that nothing is using.
 */
const pool =
  global.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // The managed database is reached through a TLS proxy that presents a
    // certificate for its own internal name, so the chain cannot be verified
    // from here. The connection is still encrypted.
    ssl: { rejectUnauthorized: false },
    max: 5,
    // A connection nothing has used for half a minute is given back rather
    // than held against the database's limit for the life of the instance.
    idleTimeoutMillis: 30_000,
    // A request waiting on a connection fails as a request rather than hanging
    // until the platform's own timeout kills the whole invocation.
    connectionTimeoutMillis: 10_000,
  });

// An idle client that the database or the proxy drops emits an error with no
// query behind it to catch it. Unhandled, that error is thrown on the process
// and takes the server down.
pool.on("error", (error) => {
  console.error("Idle database client error:", error);
});

global.pgPool = pool;

export default pool;
