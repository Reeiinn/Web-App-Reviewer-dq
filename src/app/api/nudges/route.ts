import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { NextResponse } from "next/server";

/** Enough to fill the dropdown; older reminders are history nobody scrolls. */
const LIMIT = 20;

/**
 * The signed-in account's own reminders, newest first.
 *
 * Scoped to the session's user id and nothing else — there is no parameter for
 * whose nudges to read, so a reviewee cannot ask for somebody else's.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, sender_name, message, created_at, read_at
         FROM nudges
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT ${LIMIT}`,
      [session.user.id],
    );

    const unread = await pool.query(
      `SELECT COUNT(*)::int AS count
         FROM nudges
        WHERE user_id = $1 AND read_at IS NULL`,
      [session.user.id],
    );

    return NextResponse.json({
      nudges: rows.map((row) => ({
        id: row.id,
        sender: row.sender_name,
        message: row.message,
        createdAt: row.created_at,
        read: row.read_at !== null,
      })),
      // Counted across every row, not just the twenty returned, so a buried
      // reminder still keeps the dot lit.
      unread: unread.rows[0]?.count ?? 0,
    });
  } catch (error) {
    console.error("Error loading nudges:", error);
    return NextResponse.json(
      { error: "Failed to load reminders" },
      { status: 500 },
    );
  }
}

/**
 * Marks reminders read — one when the body names an id, otherwise all of them.
 *
 * Reading is the reviewee's own act, so the id is only ever matched inside
 * their own rows: naming somebody else's leaves it untouched and reports the
 * caller's own count back.
 */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: unknown } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    body = {};
  }

  const one = typeof body.id === "string" ? body.id : null;

  try {
    if (one) {
      await pool.query(
        `UPDATE nudges SET read_at = now()
          WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
        [one, session.user.id],
      );
    } else {
      await pool.query(
        `UPDATE nudges SET read_at = now()
          WHERE user_id = $1 AND read_at IS NULL`,
        [session.user.id],
      );
    }

    const unread = await pool.query(
      `SELECT COUNT(*)::int AS count
         FROM nudges
        WHERE user_id = $1 AND read_at IS NULL`,
      [session.user.id],
    );

    return NextResponse.json({ unread: unread.rows[0]?.count ?? 0 });
  } catch (error) {
    console.error("Error marking nudges read:", error);
    return NextResponse.json(
      { error: "Failed to update reminders" },
      { status: 500 },
    );
  }
}
