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

async function applySecurityHeaders(req: NextRequest, res: NextResponse) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const isAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");
  const isWrite = req.method !== "GET";

  if (isAuthRoute) {
    const { success } = await authLimiter.limit(ip);
    if (!success) {
      return new NextResponse("Too many login attempts, try again later", {
        status: 429,
      });
    }
  } else if (isWrite) {
    const { success } = await writeLimiter.limit(ip);
    if (!success) {
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

  // Public pages: apply CSP/rate-limit only, skip auth check
  if (!isProtected(pathname)) {
    return applySecurityHeaders(req, NextResponse.next());
  }

  // Protected pages: NextAuth's auth() wrapper already redirects
  // unauthenticated users before this runs
  return applySecurityHeaders(req, NextResponse.next());
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
