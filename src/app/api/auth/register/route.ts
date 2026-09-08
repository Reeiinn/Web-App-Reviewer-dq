import pool from "@/lib/db";
import {
  claimantMatches,
  isInviteRole,
  managerForInvite,
  type InviteRole,
} from "@/lib/helper/invites";
import { registerBodySchema } from "@/lib/validation/auth.validation";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

async function explainUnusableInvite(code: string) {
  const result = await pool.query(
    `SELECT used_at, expires_at FROM registration_invites WHERE code = $1`,
    [code],
  );

  const invite = result.rows[0];
  if (!invite) return "This invitation code is not valid.";
  if (invite.used_at) {
    return "This invitation link has already been used.";
  }
  return "This invitation link has expired.";
}

export async function POST(req: Request) {
  try {
    const parsed = registerBodySchema.safeParse(
      await req.json().catch(() => null),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email, password, name, code } = parsed.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Claiming and inserting in one transaction means a link can never be
      // spent twice, and a failed signup releases it instead of burning it.
      const claim = await client.query(
        `UPDATE registration_invites SET used_at = now()
         WHERE code = $1 AND used_at IS NULL AND expires_at > now()
         RETURNING created_by, role, email`,
        [code],
      );

      if (claim.rowCount === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: await explainUnusableInvite(code) },
          { status: 400 },
        );
      }

      const invite = claim.rows[0];

      // An addressed invite belongs to one person. Rolling back rather than
      // burning the link leaves it there for whoever it was sent to.
      const claimant = claimantMatches(invite.email, email);
      if (!claimant.ok) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: claimant.error }, { status: 403 });
      }

      const role: InviteRole = isInviteRole(invite.role) ? invite.role : "USER";

      const result = await client.query(
        `INSERT INTO users (email, password, name, role, manager_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, name, role, manager_id, created_at`,
        [
          email.trim().toLowerCase(),
          hashedPassword,
          name.trim(),
          role,
          managerForInvite(role, invite.created_by),
        ],
      );

      await client.query("COMMIT");
      return NextResponse.json(result.rows[0], { status: 201 });
    } catch (dbError: any) {
      await client.query("ROLLBACK").catch(() => {});

      // unique_violation on users.email
      if (dbError.code === "23505") {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 409 },
        );
      }
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error registering user:", error);
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 },
    );
  }
}
