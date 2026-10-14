/**
 * Whether a Postgres URL points at this machine.
 *
 * The Prisma CLI, the test setup and the parity script all run against a
 * database here and never against Railway. Checking the host rather than
 * trusting a variable name is what stops a copied line from pointing a reset
 * at production.
 */
export function isLocalDatabase(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  // pg connects to a host= or hostaddr= parameter rather than the URL's own
  // host, so a local-looking URL carrying one could reach anywhere.
  if (
    parsed.searchParams.has("host") ||
    parsed.searchParams.has("hostaddr")
  ) {
    return false;
  }
  const host = parsed.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".localhost")
  );
}

/**
 * Whether two local URLs name the same database. The loopback spellings
 * (localhost, 127.0.0.1, ::1) count as one host and names are compared
 * without case, so the check errs towards "same" — it guards a wipe.
 */
export function sameLocalDatabase(a: string, b: string): boolean {
  const key = (url: string) => {
    const parsed = new URL(url);
    const host = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)
      ? "loopback"
      : parsed.hostname;
    return `${host}:${parsed.port || "5432"}${parsed.pathname.toLowerCase()}`;
  };
  return key(a) === key(b);
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
