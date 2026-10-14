/**
 * Whether a Postgres URL points at this machine.
 *
 * The Prisma CLI, the test setup and the parity script all run against a
 * database here and never against Railway. Checking the host rather than
 * trusting a variable name is what stops a copied line from pointing a reset
 * at production.
 */
export function isLocalDatabase(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".localhost")
  );
}

/** Returns the URL when it is local (or remote is allowed); throws otherwise. */
export function assertLocalDatabase(
  url: string | undefined,
  options: { allowRemote?: boolean } = {},
): string {
  if (!url) {
    throw new Error("Database URL is not set.");
  }
  if (options.allowRemote || isLocalDatabase(url)) {
    return url;
  }
  let host = "an unparseable URL";
  try {
    host = new URL(url).hostname;
  } catch {}
  throw new Error(
    `Refusing to use the database at ${host}: only a local database is allowed here.`,
  );
}
