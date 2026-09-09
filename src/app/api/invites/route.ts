import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { appUrl } from "@/lib/helper/app-url";
import { touchLastSeen } from "@/app/api/_lib/presence-store";
import pool from "@/lib/db";
import {
  canInvite,
  isInviteRole,
  normaliseEmail,
  type InviteRole,
} from "@/lib/helper/invites";
import { staffTitleFor } from "@/lib/helper/roles";
import { mailerConfigured, sendMail } from "@/lib/mailer";
import { NextResponse } from "next/server";

/**
 * Creates a signup link.
 *
 * With no body it is the open reviewee link the console has always made. Given
 * a role and an address it becomes an addressed invite: bound to that person,
 * granting the role it names, and emailed to them if a mailer is configured.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    role: senderRole,
    id: currentUserId,
    name: senderName,
  } = session.user;

  let body: { role?: unknown; email?: unknown } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    body = {};
  }

  const role: InviteRole = isInviteRole(body.role) ? body.role : "USER";

  const allowed = canInvite(senderRole, role);
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.error }, { status: 403 });
  }

  const email =
    typeof body.email === "string" && body.email.trim()
      ? normaliseEmail(body.email)
      : null;

  // An addressed invite is the whole point of the Field Manager flow — there
  // is nobody to hand an open link to.
  if (role === "MANAGER" && !email) {
    return NextResponse.json(
      { error: "Enter the email address to invite." },
      { status: 400 },
    );
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "That email address does not look right." },
      { status: 400 },
    );
  }

  await touchLastSeen(currentUserId);

  try {
    if (email) {
      const taken = await pool.query(`SELECT id FROM users WHERE email = $1`, [
        email,
      ]);

      if (taken.rowCount) {
        return NextResponse.json(
          { error: "That email already has an account." },
          { status: 409 },
        );
      }

      // A second invite to the same person replaces the first, so an address
      // never ends up holding two live links to spend.
      await pool.query(
        `UPDATE registration_invites SET used_at = now()
          WHERE email = $1 AND used_at IS NULL`,
        [email],
      );
    }

    const result = await pool.query(
      `INSERT INTO registration_invites (code, created_by, role, email, expires_at)
       VALUES ($1, $2, $3, $4, now() + INTERVAL '7 days')
       RETURNING code, expires_at, role, email`,
      [randomBytes(16).toString("base64url"), currentUserId, role, email],
    );

    const invite = result.rows[0];
    // Built on the app's own address, not on the host this request arrived at:
    // an invite is pasted into a chat or an inbox and opened elsewhere.
    const link = appUrl(req, `/signup?code=${encodeURIComponent(invite.code)}`);

    // The open link goes back with the invite too, so the console shows the
    // same address the emailed one carries.
    if (!email) {
      return NextResponse.json({ ...invite, link }, { status: 201 });
    }

    const title = staffTitleFor(role) ?? "reviewee";
    const mail = await sendMail({
      to: email,
      subject: `You have been invited as a ${title}`,
      text: [
        `${senderName ?? "Your Sales Manager"} has invited you to join INSURE as a ${title}.`,
        "",
        `Set up your account here: ${link}`,
        "",
        "The link works once and expires in 7 days.",
      ].join("\n"),
    });

    return NextResponse.json(
      {
        ...invite,
        link,
        // The link rides back whenever the mail did not go, so an unconfigured
        // mailer leaves the Sales Manager something to send by hand rather
        // than an invite nobody can reach.
        sent: mail.sent,
        reason: mail.sent ? undefined : mail.reason,
        mailerConfigured: mailerConfigured(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating registration invite:", error);
    return NextResponse.json(
      { error: "Failed to create invitation link" },
      { status: 500 },
    );
  }
}
