import { auth } from "@/lib/auth";
import { touchLastSeen } from "@/app/api/_lib/presence-store";
import pool from "@/lib/db";
import {
  canDeleteNudge,
  canNudge,
  nudgeAllowedAfter,
  nudgeCooldownMessage,
  resolveNudge,
} from "@/lib/helper/nudges";
import { NextResponse } from "next/server";

/**
 * The staff guard both handlers here open with: signed in, staff, and allowed
 * to reach this particular reviewee. Returns the response to send back, or the
 * session details the handler needs once it passes.
 */
async function reachReviewee(revieweeId: string) {
  const session = await auth();
  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { role, id: currentUserId, name } = session.user;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  await touchLastSeen(currentUserId);

  const target = await pool.query(
    `SELECT id, name, role, manager_id FROM users
      WHERE id = $1 AND deleted_at IS NULL`,
    [revieweeId],
  );

  const reviewee = target.rows[0];
  if (!reviewee) {
    return {
      error: NextResponse.json(
        { error: "That reviewee no longer exists." },
        { status: 404 },
      ),
    };
  }

  const allowed = canNudge({ role, id: currentUserId }, reviewee);
  if (!allowed.ok) {
    return {
      error: NextResponse.json({ error: allowed.error }, { status: 403 }),
    };
  }

  return { sender: { role, id: currentUserId, name }, reviewee };
}

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
    const reach = await reachReviewee(id);
    if (reach.error) return reach.error;

    const { sender, reviewee } = reach;

    // One sender, one reviewee, one reminder per cooldown. Enforced here rather
    // than in the dialog: the dialog is a courtesy, this is the rule.
    const last = await pool.query(
      `SELECT created_at FROM nudges
        WHERE user_id = $1 AND sender_id = $2
        ORDER BY created_at DESC
        LIMIT 1`,
      [id, sender.id],
    );

    const lastSentAt = last.rows[0]?.created_at
      ? new Date(last.rows[0].created_at).getTime()
      : null;

    const msSinceLast = lastSentAt === null ? null : Date.now() - lastSentAt;

    if (!nudgeAllowedAfter(msSinceLast)) {
      return NextResponse.json(
        { error: nudgeCooldownMessage(reviewee.name, msSinceLast ?? 0) },
        { status: 429 },
      );
    }

    const inserted = await pool.query(
      `INSERT INTO nudges (user_id, sender_id, sender_name, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, sender_id, sender_name, message, created_at, read_at`,
      [id, sender.id, sender.name ?? "Your manager", resolved.message],
    );

    return NextResponse.json({
      message: `Reminder sent to ${reviewee.name}.`,
      nudge: asSentNudge(inserted.rows[0]),
    });
  } catch (error) {
    console.error("Error sending nudge:", error);
    return NextResponse.json(
      { error: "Failed to send the reminder" },
      { status: 500 },
    );
  }
}

type NudgeRow = {
  id: string;
  sender_id: string | null;
  sender_name: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

const asSentNudge = (row: NudgeRow) => ({
  id: row.id,
  senderId: row.sender_id,
  sender: row.sender_name,
  message: row.message,
  createdAt: row.created_at,
  read: row.read_at !== null,
});

/**
 * The reminders this reviewee has been sent, so the dialog can show what has
 * already gone out before a manager adds another — and offer to take one back.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const reach = await reachReviewee(id);
    if (reach.error) return reach.error;

    const { rows } = await pool.query(
      `SELECT id, sender_id, sender_name, message, created_at, read_at
         FROM nudges
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 20`,
      [id],
    );

    return NextResponse.json({
      nudges: rows.map(asSentNudge),
      /** Who is asking, so the dialog knows which rows it may offer to delete. */
      viewer: { id: reach.sender.id, role: reach.sender.role },
    });
  } catch (error) {
    console.error("Error loading sent nudges:", error);
    return NextResponse.json(
      { error: "Failed to load reminders" },
      { status: 500 },
    );
  }
}

/**
 * Takes back one reminder. A unit manager may delete only what they sent; the
 * Sales Manager may clear any of them.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const nudgeId = new URL(req.url).searchParams.get("nudge");

  if (!nudgeId) {
    return NextResponse.json(
      { error: "Name the reminder to delete." },
      { status: 400 },
    );
  }

  try {
    const reach = await reachReviewee(id);
    if (reach.error) return reach.error;

    const found = await pool.query(
      `SELECT id, sender_id FROM nudges WHERE id = $1 AND user_id = $2`,
      [nudgeId, id],
    );

    const nudge = found.rows[0];
    if (!nudge) {
      return NextResponse.json(
        { error: "That reminder is already gone." },
        { status: 404 },
      );
    }

    const allowed = canDeleteNudge(reach.sender, nudge);
    if (!allowed.ok) {
      return NextResponse.json({ error: allowed.error }, { status: 403 });
    }

    await pool.query(`DELETE FROM nudges WHERE id = $1`, [nudgeId]);

    return NextResponse.json({ message: "Reminder deleted.", id: nudgeId });
  } catch (error) {
    console.error("Error deleting nudge:", error);
    return NextResponse.json(
      { error: "Failed to delete the reminder" },
      { status: 500 },
    );
  }
}
