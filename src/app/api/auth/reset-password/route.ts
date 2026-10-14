import { hashResetToken, isTokenUsable } from "@/lib/helper/reset-token";
import { resetPasswordSchema } from "@/lib/validation/auth.validation";
import { findResetToken, resetPassword } from "@/server/data/users";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

const INVALID_TOKEN =
  "This reset link is invalid or has expired. Please request a new one.";

export async function POST(req: Request) {
  try {
    const parsed = resetPasswordSchema.safeParse(
      await req.json().catch(() => null),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { token, password } = parsed.data;
    const tokenHash = hashResetToken(token);

    const record = await findResetToken(tokenHash);

    if (!record || !isTokenUsable(record)) {
      return NextResponse.json({ error: INVALID_TOKEN }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Spending the token conditionally means two submissions of the same link
    // cannot both succeed.
    const reset = await resetPassword(record.id, record.userId, hashedPassword);

    if (!reset) {
      return NextResponse.json({ error: INVALID_TOKEN }, { status: 400 });
    }

    return NextResponse.json({
      message: "Your password has been reset. You can sign in now.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 },
    );
  }
}
