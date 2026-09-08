import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextRequest, NextResponse } from "next/server";
import { writeLimiter, authIpLimiter } from "@/lib/helper/rateLimit";

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

async function applySecurityHeaders(req: NextRequest, res: NextResponse) {
  const forwardedFor = req.headers.get("x-forwarded-for");

  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const pathname = req.nextUrl.pathname;

  const isAuthRoute = pathname.startsWith("/api/auth");
  const isSignIn = pathname === "/api/auth/signin";

  const isWrite = req.method !== "GET";

  /*
   * Only rate-limit the actual sign-in endpoint by IP.
   *
   * Auth.js needs unrestricted access to:
   * - /api/auth/session
   * - /api/auth/csrf
   * - /api/auth/signout
   */
  if (isSignIn && req.method === "POST") {
    const allowed = await safeLimitCheck(authIpLimiter, ip);

    if (!allowed) {
      return new NextResponse(
        "Too many login attempts. Please try again later.",
        {
          status: 429,
        },
      );
    }
  } else if (!isAuthRoute && isWrite) {
    const allowed = await safeLimitCheck(writeLimiter, ip);

    if (!allowed) {
      return new NextResponse("Too many requests", {
        status: 429,
      });
    }
  }

  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: blob:; " +
      "connect-src 'self' https://challenges.cloudflare.com; " +
      "frame-src https://challenges.cloudflare.com;",
  );

  return res;
}

export default auth(async (req: NextRequest) => {
  return applySecurityHeaders(req, NextResponse.next());
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/learningMethods/:path*",
    "/glossary/:path*",
    "/analytics/:path*",
    "/certificates/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/invites/:path*",
    "/api/attempts/:path*",
    "/api/flashcards/:path*",
    "/api/glossary/:path*",
    "/api/memorization/:path*",
    "/api/progress/:path*",
    "/api/questions/:path*",
    "/api/streaks/:path*",
  ],
};
