import pool from "@/lib/db";
import { appUrl } from "@/lib/helper/app-url";
import { createResetToken } from "@/lib/helper/reset-token";
import { mailerConfigured, sendMail } from "@/lib/mailer";
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

    const mail = await sendMail({
      to: email,
      subject: "Reset your INSURE password",
      text: [
        "A password reset was requested for this INSURE account.",
        "",
        `Reset your password here: ${resetUrl}`,
        "",
        "The link works once and expires in one hour.",
        "If you did not ask for this, ignore this email and your password stays as it is.",
      ].join("\n"),
    });

    // A reset nobody receives looks the same from the outside as one that
    // arrived, so the failure is only visible if it is written down.
    if (!mail.sent) {
      console.error(
        "Password reset email not sent:",
        mail.reason,
        mail.reason === "failed" ? (mail.detail ?? "") : "",
      );
    }

    // The link rides back in the response only outside production, where there
    // may be no mailer to carry it. In production it would reach whoever typed
    // the address rather than whoever owns it, which is an account takeover.
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    return NextResponse.json({
      message: GENERIC_MESSAGE,
      // Nothing to open by hand once the mail is on its way.
      ...(mail.sent ? {} : { resetUrl }),
      sent: mail.sent,
      mailerConfigured: mailerConfigured(),
    });
  } catch (error) {
    console.error("Error creating password reset token:", error);
    return NextResponse.json(
      { error: "Failed to start password reset" },
      { status: 500 },
    );
  }
}
