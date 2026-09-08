// middleware.ts
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextRequest, NextResponse } from "next/server";
import { writeLimiter, authLimiter } from "@/lib/helper/rateLimit";

const { auth } = NextAuth(authConfig);

const PROTECTED_ROUTES = [
  "/dashboard",
  "/learningMethods",
  "/glossary",
  "/analytics",
  "/admin",
  "/api/admin",
  "/api/invites",
  "/api/attempts",
  "/api/flashcards",
  "/api/glossary",
  "/api/memorization",
  "/api/progress",
  "/api/questions",
  "/api/streaks",
];

function isProtected(pathname: string) {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

async function safeLimitCheck(
  limiter: typeof writeLimiter,
  ip: string,
): Promise<boolean> {
  try {
    const { success } = await limiter.limit(ip);
    return success;
  } catch (err) {
    // If Upstash is unreachable/misconfigured, don't take the whole site
    // down — log it and let the request through. A rate limiter failing
    // open is far safer than the entire app failing closed.
    console.error("Rate limiter check failed, failing open:", err);
    return true;
  }
}

async function applySecurityHeaders(req: NextRequest, res: NextResponse) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");
  const isWrite = req.method !== "GET";

  if (isAuthRoute) {
    const allowed = await safeLimitCheck(authLimiter, ip);
    if (!allowed) {
      return new NextResponse("Too many login attempts, try again later", {
        status: 429,
      });
    }
  } else if (isWrite) {
    const allowed = await safeLimitCheck(writeLimiter, ip);
    if (!allowed) {
      return new NextResponse("Too many requests", { status: 429 });
    }
  }

  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  );

  return res;
}

export default auth(async (req: NextRequest) => {
  const { pathname } = req.nextUrl;
  return applySecurityHeaders(req, NextResponse.next());
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
