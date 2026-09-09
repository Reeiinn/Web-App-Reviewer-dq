import pool from "@/lib/db";
import { appUrl } from "@/lib/helper/app-url";
import { createResetToken } from "@/lib/helper/reset-token";
import { forgotPasswordSchema } from "@/lib/validation/auth.validation";
import { NextResponse } from "next/server";

/**
 * Always answers the same way whether or not the address is registered — a
 * differing response would turn this endpoint into an account-existence oracle.
 */
const GENERIC_MESSAGE =
  "If that email is registered, a reset link is on its way.";

export async function POST(req: Request) {
  try {
    const parsed = forgotPasswordSchema.safeParse(
      await req.json().catch(() => null),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const user = await pool.query(
      `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    );

    if (user.rowCount === 0) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const userId = user.rows[0].id;
    const { token, tokenHash, expiresAt } = createResetToken();

    // Any earlier link for this account stops working the moment a new one is
    // issued, so a forwarded old email cannot be replayed.
    await pool.query(
      `UPDATE password_reset_tokens SET used_at = now()
       WHERE user_id = $1 AND used_at IS NULL`,
      [userId],
    );

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, expiresAt],
    );

    // The app's own address: a reset link is opened from an inbox, not from
    // the host this request arrived at.
    const resetUrl = appUrl(req, `/reset-password?token=${token}`);

    // No mailer is wired up yet. Outside production the link comes back in the
    // response so the flow is usable; in production it is withheld.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    return NextResponse.json({ message: GENERIC_MESSAGE, resetUrl });
  } catch (error) {
    console.error("Error creating password reset token:", error);
    return NextResponse.json(
      { error: "Failed to start password reset" },
      { status: 500 },
    );
  }
}
