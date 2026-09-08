import { auth } from "@/lib/auth";
import { touchLastSeen } from "@/app/api/_lib/presence-store";
import pool from "@/lib/db";
import { canNudge, resolveNudge } from "@/lib/helper/nudges";
import { NextResponse } from "next/server";

/**
 * Sends one reviewee a reminder from the roster.
 *
 * The console could say a reviewee had slipped but not reach them, so chasing
 * happened outside the product and left no record. A nudge lands in the app
 * they study in, and the row it writes is the record.
 *
 * Only the words the server resolves are stored: the client names a preset,
 * or writes its own text, and the helper decides which of those a row carries.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, id: currentUserId, name: senderName } = session.user;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await touchLastSeen(currentUserId);

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const resolved = resolveNudge((body ?? {}) as Record<string, unknown>);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  try {
    const target = await pool.query(
      `SELECT id, name, role, manager_id FROM users WHERE id = $1`,
      [id],
    );

    const user = target.rows[0];
    if (!user) {
      return NextResponse.json(
        { error: "That reviewee no longer exists." },
        { status: 404 },
      );
    }

    const allowed = canNudge({ role, id: currentUserId }, user);
    if (!allowed.ok) {
      return NextResponse.json({ error: allowed.error }, { status: 403 });
    }

    await pool.query(
      `INSERT INTO nudges (user_id, sender_id, sender_name, message)
       VALUES ($1, $2, $3, $4)`,
      [id, currentUserId, senderName ?? "Your manager", resolved.message],
    );

    return NextResponse.json({
      message: `Reminder sent to ${user.name}.`,
    });
  } catch (error) {
    console.error("Error sending nudge:", error);
    return NextResponse.json(
      { error: "Failed to send the reminder" },
      { status: 500 },
    );
  }
}
