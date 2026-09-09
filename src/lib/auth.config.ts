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

const isProduction = process.env.NODE_ENV === "production";

export const authConfig: NextAuthConfig = {
  /**
   * The app runs behind a proxy in production, so the host on the request is
   * the internal one. Without this Auth.js refuses it as UntrustedHost and
   * sign-in fails outright. AUTH_URL names the address it should believe
   * instead; see the deployment section of the README.
   */
  trustHost: true,

  /**
   * A day, refreshed at most hourly.
   *
   * The default is thirty. Role and manager live in the token, so for thirty
   * days a demoted Sales Manager kept the console, a reassigned reviewee kept
   * their old manager's oversight, and a deleted account kept a working
   * session. Shortening the window bounds that; the jwt callback below closes
   * the rest of it by re-reading the account each time the token is refreshed.
   */
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
    updateAge: 60 * 60,
  },

  /**
   * Spelled out rather than inherited.
   *
   * The defaults are already httpOnly and SameSite=Lax, and `secure` follows
   * whatever address Auth.js has worked out for itself — which is exactly the
   * kind of thing that changes underneath a deployment without anyone noticing.
   * Stating it makes the posture reviewable, and makes a regression a diff.
   *
   * SameSite=Lax rather than Strict: Strict withholds the cookie on a
   * navigation into the app from anywhere else, so following an invitation
   * link out of an email would land the recipient on a signed-out page.
   */
  cookies: {
    sessionToken: {
      name: isProduction
        ? "__Secure-authjs.session-token"
        : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
    callbackUrl: {
      name: isProduction
        ? "__Secure-authjs.callback-url"
        : "authjs.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
    csrfToken: {
      // The double-submit cookie carries a __Host- prefix: it is scoped to this
      // exact origin, and no subdomain may write over it.
      name: isProduction ? "__Host-authjs.csrf-token" : "authjs.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
      },
    },
  },
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
