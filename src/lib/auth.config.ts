import { isStaff } from "@/lib/helper/roles";
import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

/**
 * Screens that exist to study a track, so they belong to reviewees alone.
 * Analytics is here because it charts the signed-in account's own mastery,
 * which is empty for staff. Glossary stays open — it is reference material.
 */
const learnerOnly = ["/dashboard", "/learningMethods", "/analytics"];

/**
 * Screens and endpoints that answer to anyone.
 *
 * The middleware runs over the whole app now, so signing in, signing up and
 * resetting a password have to be reachable without a session — and the
 * marketing and legal pages are public by intent. Auth.js sends an unauthorised
 * caller to "/", so leaving "/" out would be a redirect to itself.
 */
const publicPaths = [
  "/",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/about",
  "/help",
  "/privacy",
  "/terms",
  // Sign-in, sign-out, the CSRF token, registration and the reset endpoints.
  "/api/auth",
];

const isPublic = (pathname: string) =>
  publicPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  providers: [], // filled in by the full config in auth.ts
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const staff = isStaff(auth?.user?.role);

      if (isPublic(pathname)) return true;

      if (pathname.startsWith("/admin")) {
        // Managers see their own reports; admins see everyone. The roster API
        // applies the same rule to the data itself.
        return isLoggedIn && staff;
      }

      // Send staff to the console rather than refusing them: they have no
      // learner record to build, so the study screens have nothing to show.
      if (
        isLoggedIn &&
        staff &&
        learnerOnly.some((prefix) => pathname.startsWith(prefix))
      ) {
        return NextResponse.redirect(new URL("/admin", request.nextUrl));
      }

      // An API caller is a fetch(), not a browser following a redirect: it
      // parses the body it gets back, and a sign-in page arrives as HTML that
      // throws in JSON.parse. The routes themselves answer 401 the same way.
      if (!isLoggedIn && pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      return isLoggedIn;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.managerId = (user as any).managerId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).managerId = token.managerId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
};
