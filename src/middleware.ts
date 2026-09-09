import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextRequest, NextResponse } from "next/server";
import {
  writeLimiter,
  authIpLimiter,
  examAnswerLimiter,
} from "@/lib/helper/rateLimit";

const { auth } = NextAuth(authConfig);

async function safeLimitCheck(
  limiter: typeof writeLimiter,
  key: string,
): Promise<boolean> {
  try {
    const { success } = await limiter.limit(key);
    return success;
  } catch (err) {
    console.error("Rate limiter check failed, failing open:", err);

    return true;
  }
}

/**
 * Every route behind the matcher is called with `fetch(...).then(r => r.json())`,
 * and the API routes it fronts all answer with `{ error }`. A plain-text body
 * here broke that contract: the caller got `Unexpected token 'T', "Too many
 * requests" is not valid JSON` instead of the message, so the person being
 * limited was shown a parser error rather than being told to wait.
 */
function tooManyRequests(error: string) {
  return NextResponse.json({ error }, { status: 429 });
}

/**
 * Where a credentials sign-in is actually posted.
 *
 * The limiter used to watch /api/auth/signin, which is the page Auth.js serves,
 * not the endpoint it posts to — signIn("credentials") goes to the callback
 * below. Guarding the wrong path meant the per-IP login limit had never once
 * fired, leaving the per-email limit in authorize() as the only thing standing
 * between the app and a run through a credential list.
 */
const SIGN_IN_PATH = "/api/auth/callback/credentials";

/** Auth.js needs these unrestricted: session, csrf and signout are plumbing. */
const isSignInPost = (pathname: string, method: string) =>
  method === "POST" && pathname === SIGN_IN_PATH;

async function applySecurityHeaders(
  req: NextRequest,
  res: NextResponse,
  /** The signed-in account, when there is one, for per-account limiting. */
  userId?: string,
) {
  const forwardedFor = req.headers.get("x-forwarded-for");

  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const pathname = req.nextUrl.pathname;

  const isAuthRoute = pathname.startsWith("/api/auth");
  const isWrite = req.method !== "GET";

  // A shared address is one budget between everyone behind it, so a signed-in
  // caller is limited as themselves and only an anonymous one falls back to IP.
  const writeKey = userId ? `user:${userId}` : `ip:${ip}`;

  const isExamAnswer =
    /^\/api\/attempts\/[^/]+\/answers$/.test(pathname) && req.method === "POST";

  if (isSignInPost(pathname, req.method)) {
    const allowed = await safeLimitCheck(authIpLimiter, ip);

    if (!allowed) {
      return tooManyRequests(
        "Too many login attempts. Please try again later.",
      );
    }
  } else if (isExamAnswer) {
    const allowed = await safeLimitCheck(examAnswerLimiter, writeKey);

    if (!allowed) {
      return tooManyRequests("Answers are being saved too quickly.");
    }
  } else if (!isAuthRoute && isWrite) {
    const allowed = await safeLimitCheck(writeLimiter, writeKey);

    if (!allowed) {
      return tooManyRequests("Too many requests. Please slow down.");
    }
  }

  return res;
}

/**
 * The policy the browser is given.
 *
 * The policy closes what it never named: where the page may be framed, what a
 * <base> may rewrite, where a form may post, and plugins.
 *
 * script-src still carries 'unsafe-inline', and that is a measured decision
 * rather than an oversight. The alternative is a per-request nonce, which was
 * tried: Next serves this app's shells from its prerender cache, those shells
 * carry inline bootstrap scripts with no nonce on them, and a nonce policy
 * stops them — the sign-in page rendered as static HTML that never hydrated and
 * never drew its Turnstile widget. What keeps injected script out meanwhile is
 * that nothing here writes markup into the page: there is no
 * dangerouslySetInnerHTML in the codebase, so every value is escaped by React.
 * Revisit if the shells ever ship nonces of their own.
 */
function contentSecurityPolicy(isDev: boolean) {
  /*
   * `unsafe-eval` and the websocket origins are development-only.
   *
   * React's development build calls eval() to rebuild callstacks that cross
   * the server/client boundary, and the dev server pushes updates over a
   * websocket. Without them the app refuses to render locally with "eval() is
   * not supported in this environment". Neither is needed by the production
   * build, and neither is granted to it.
   *
   */
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com"
    : "'self' 'unsafe-inline' https://challenges.cloudflare.com";

  const connectSrc = isDev
    ? "'self' ws: wss: https://challenges.cloudflare.com"
    : "'self' https://challenges.cloudflare.com";

  return (
    "default-src 'self'; " +
    `script-src ${scriptSrc}; ` +
    // Inline styles stay: Tailwind's own utilities are in a stylesheet, but
    // style attributes on elements are not, and nothing nonces those.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: blob:; " +
    `connect-src ${connectSrc}; ` +
    "frame-src https://challenges.cloudflare.com; " +
    "worker-src 'self' blob:; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "frame-ancestors 'none'; " +
    "upgrade-insecure-requests"
  );
}

/** Headers that say nothing about this request and everything about the app. */
function applyStaticHeaders(res: NextResponse, isDev: boolean) {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Nothing here asks for a camera, a microphone or a location, so nothing may.
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  // frame-ancestors covers modern browsers; this covers the rest.
  res.headers.set("X-Frame-Options", "DENY");

  // Only over TLS, and never announced from a dev server on http.
  if (!isDev) {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return res;
}

export default auth(async (req) => {
  const isDev = process.env.NODE_ENV === "development";

  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", contentSecurityPolicy(isDev));
  applyStaticHeaders(res, isDev);

  return applySecurityHeaders(req as NextRequest, res, req.auth?.user?.id);
});

export const config = {
  /**
   * Everything, rather than a list of routes to keep in step with the app.
   *
   * The list left /api/auth, /api/user, /api/nudges and /api/recent-activity
   * outside: no write limit on any of them, no login limit at all, and no
   * security headers on the sign-in page — the one screen where a header is
   * worth most. A route added tomorrow would have been outside it too.
   *
   * Excluded are Next's own build output and the icons in /public, which carry
   * nothing to protect and would only add a middleware invocation per asset.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?)$).*)",
  ],
};
