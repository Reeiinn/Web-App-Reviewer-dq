import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Next 16 needs a real function export here; a destructured const is not
// recognised as one.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/learningMethods/:path*",
    "/glossary/:path*",
    "/analytics/:path*",
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
