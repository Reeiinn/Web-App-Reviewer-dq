import { auth } from "@/lib/auth";
import { listNudges, markNudgesRead, unreadNudgeCount } from "@/server/data/staff";
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
    const nudges = await listNudges(session.user.id, LIMIT);
    const unread = await unreadNudgeCount(session.user.id);

    return NextResponse.json({
      nudges: nudges.map((row) => ({
        id: row.id,
        sender: row.senderName,
        message: row.message,
        createdAt: row.createdAt,
        read: row.readAt !== null,
      })),
      // Counted across every row, not just the twenty returned, so a buried
      // reminder still keeps the dot lit.
      unread,
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
    await markNudgesRead(session.user.id, one);
    return NextResponse.json({ unread: await unreadNudgeCount(session.user.id) });
  } catch (error) {
    console.error("Error marking nudges read:", error);
    return NextResponse.json(
      { error: "Failed to update reminders" },
      { status: 500 },
    );
  }
}
