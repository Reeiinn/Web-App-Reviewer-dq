import { auth } from "@/lib/auth";
import { touchLastSeen } from "@/app/api/_lib/presence-store";
import pool from "@/lib/db";
import { NextResponse } from "next/server";

/**
 * Removes a reviewee and everything they have done. Progress, attempts,
 * streaks and reset tokens all cascade from users.id, so one delete is enough.
 *
 * Deliberately narrow: only USER accounts can be removed, an admin cannot
 * delete themselves, and a manager can only remove their own reports.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, id: currentUserId } = session.user;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await touchLastSeen(currentUserId);

  const { id } = await params;

  if (id === currentUserId) {
    return NextResponse.json(
      { error: "You cannot remove your own account." },
      { status: 400 },
    );
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

    if (user.role !== "USER") {
      return NextResponse.json(
        { error: "Only reviewee accounts can be removed here." },
        { status: 403 },
      );
    }

    if (role === "MANAGER" && user.manager_id !== currentUserId) {
      return NextResponse.json(
        { error: "You can only remove reviewees you manage." },
        { status: 403 },
      );
    }

    await pool.query(`DELETE FROM users WHERE id = $1`, [id]);

    return NextResponse.json({
      message: `${user.name} has been removed.`,
      id,
    });
  } catch (error) {
    console.error("Error removing reviewee:", error);
    return NextResponse.json(
      { error: "Failed to remove reviewee" },
      { status: 500 },
    );
  }
}
