import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import pool from "@/lib/db";
import { authConfig } from "./auth.config";
import { verifyTurnstile } from "./helper/turnstile";
import { authEmailLimiter } from "./helper/rateLimit";

class RateLimitError extends CredentialsSignin {
  code = "rate_limit";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
        turnstileToken: {
          label: "Turnstile Token",
          type: "text",
        },
      },

      async authorize(credentials) {
        const { email, password, turnstileToken } = credentials as {
          email: string;
          password: string;
          turnstileToken: string;
        };

        if (!email || !password || !turnstileToken) {
          return null;
        }

        const normalizedEmail = email.trim().toLowerCase();

        const isHuman = await verifyTurnstile(turnstileToken);

        if (!isHuman) {
          return null;
        }

        const { success } = await authEmailLimiter.limit(normalizedEmail);

        if (!success) {
          throw new RateLimitError();
        }

        const result = await pool.query(
          `SELECT
             id,
             email,
             password,
             name,
             role,
             manager_id
           FROM users
           WHERE email = $1`,
          [normalizedEmail],
        );

        const user = result.rows[0];

        if (!user) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          managerId: user.manager_id,
        };
      },
    }),
  ],

  callbacks: {
    ...authConfig.callbacks,

    /**
     * Refreshes what the token claims about the account.
     *
     * Role and manager were written once, at sign-in, and believed for the
     * life of the token. Whatever the session's length, that is a window in
     * which a demoted Sales Manager still reaches the console and a reassigned
     * reviewee is still overseen by the manager they were moved away from,
     * because nothing in the request path asks the database who they are.
     *
     * Auth.js refreshes the token on its own schedule (updateAge), and each
     * time it does, this reads the account again. An account that has been
     * deleted has no answer to give, and returning null there ends the session
     * rather than carrying its claims forward.
     *
     * This lives here rather than in auth.config.ts because that file is also
     * the middleware's config, and the middleware runs on the edge where the
     * Postgres pool cannot.
     */
    async jwt({ token, user, ...rest }) {
      const base = await authConfig.callbacks!.jwt!({ token, user, ...rest });
      if (!base) return base;

      if (user || !base.id) return base;

      try {
        const current = await pool.query(
          `SELECT role, manager_id FROM users WHERE id = $1`,
          [base.id],
        );

        const account = current.rows[0];
        if (!account) return null;

        base.role = account.role;
        base.managerId = account.manager_id;
      } catch (error) {
        // A database that cannot answer is not grounds for signing everyone
        // out; the claims already in the token stand until the next refresh.
        console.error("Failed to refresh session claims:", error);
      }

      return base;
    },
  },
});
