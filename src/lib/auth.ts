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
});
