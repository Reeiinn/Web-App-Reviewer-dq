/**
 * The address the app is reachable at, for links that leave it.
 *
 * A signup invite or a password reset is pasted into a chat or an inbox and
 * opened somewhere else entirely, so it cannot be built from whatever host the
 * request happened to arrive on. `new URL(req.url).origin` is that host: behind
 * a proxy or a serverless platform it is the internal one — http, an internal
 * port, sometimes localhost — and a link built from it is dead the moment it
 * leaves the machine.
 *
 * The deployment's own configuration is asked first, then the proxy's forwarded
 * headers, and only then the request itself.
 *
 * Set one of these in production and every outbound link is right:
 *   APP_URL (or NEXT_PUBLIC_APP_URL)  the app's canonical address
 *   AUTH_URL (or NEXTAUTH_URL)        what NextAuth is already configured with
 * On Vercel neither is required: the project's production domain is read from
 * the platform's own variables.
 */

/** Environment values that name the whole origin, best first. */
const CONFIGURED = [
  "APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "AUTH_URL",
  "NEXTAUTH_URL",
] as const;

/**
 * Platform variables that carry a bare host. The production domain comes first:
 * VERCEL_URL is the one-off deployment address, which works but pins a link to
 * a build that later deployments replace.
 */
const PLATFORM_HOSTS = ["VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"] as const;

type Env = Record<string, string | undefined>;

/** An origin, with any trailing slash and path dropped. */
function toOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`)
      .origin;
  } catch {
    return null;
  }
}

/** What the proxy in front of the app says the browser asked for. */
function forwardedOrigin(req: Request): string | null {
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  if (!host) return null;

  // A comma-separated chain lists the first proxy first: that is the edge the
  // browser actually reached.
  const first = (value: string) => value.split(",")[0]!.trim();
  const proto = req.headers.get("x-forwarded-proto");

  return toOrigin(`${proto ? first(proto) : "https"}://${first(host)}`);
}

/**
 * The origin to build an outbound link on.
 *
 * `req` is the last resort, and is only right when the app is served directly.
 */
export function appOrigin(req: Request, env: Env = process.env): string {
  for (const key of CONFIGURED) {
    const origin = env[key] && toOrigin(env[key]!);
    if (origin) return origin;
  }

  for (const key of PLATFORM_HOSTS) {
    const origin = env[key] && toOrigin(env[key]!);
    if (origin) return origin;
  }

  return forwardedOrigin(req) ?? new URL(req.url).origin;
}

/** An absolute app URL for a path, ready to be emailed or pasted. */
export function appUrl(req: Request, path: string, env: Env = process.env) {
  return `${appOrigin(req, env)}${path.startsWith("/") ? path : `/${path}`}`;
}
