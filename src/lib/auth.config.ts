import { isStaff } from "@/lib/helper/roles";
import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

/**
 * Screens that exist to study a track, so they belong to reviewees alone.
 * Analytics is here because it charts the signed-in account's own mastery,
 * which is empty for staff. Glossary stays open — it is reference material.
 */
const learnerOnly = ["/dashboard", "/learningMethods", "/analytics"];

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  providers: [], // filled in by the full config in auth.ts
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const staff = isStaff(auth?.user?.role);

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
