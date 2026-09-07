import { touchLastSeen } from "@/app/api/_lib/presence-store";
import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { presenceStatus } from "@/lib/helper/presence";
import { NextResponse } from "next/server";

/**
 * Field managers and when each one last opened the app.
 *
 * Admin-only. A manager comparing themselves against their peers is a
 * different feature with a different conversation behind it, so MANAGER is
 * refused here even though it is allowed on the roster.
 *
 * last_seen_at is written by the routes every screen calls, so it says the
 * account loaded one — not that anyone is looking at one now. The
 * recruit counts ride along because the join is already there, and "opened
 * the app yesterday, recruited nobody" answers rather more than a date does.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, id: currentUserId } = session.user;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await touchLastSeen(currentUserId);

  try {
    const result = await pool.query(
      // The console ranks on the recruit count, so the rows arrive in that
      // order already: a client that renders them as they came still shows the
      // ranking, and the sort it applies only reorders what it was given.
      `SELECT u.id, u.name, u.email, u.image, u.last_seen_at,
              COUNT(r.id) AS reviewees,
              COUNT(r.id) FILTER (
                WHERE r.created_at >= date_trunc('month', now())
              ) AS new_this_month
         FROM users u
         LEFT JOIN users r ON r.manager_id = u.id AND r.role = 'USER'
        WHERE u.role = 'MANAGER'
        GROUP BY u.id
        ORDER BY COUNT(r.id) DESC,
                 u.last_seen_at DESC NULLS LAST,
                 u.name ASC`,
    );

    const managers = result.rows.map((row) => {
      // pg hands back a Date for timestamptz. Settling on an ISO string here
      // keeps the shape the same whether a caller reads it or JSON does.
      const lastSeenAt = row.last_seen_at
        ? new Date(row.last_seen_at).toISOString()
        : null;

      return {
        id: row.id,
        name: row.name,
        email: row.email,
        image: row.image ?? null,
        // Null for an account that has not made a request since the column
        // was added, which reads the same as never having opened the app.
        lastSeenAt,
        status: presenceStatus(lastSeenAt),
        reviewees: Number(row.reviewees),
        // Recruits who signed up since the first of the current month, which
        // separates a manager still recruiting from one coasting on a total
        // banked months ago.
        newThisMonth: Number(row.new_this_month),
      };
    });

    return NextResponse.json(managers);
  } catch (error) {
    console.error("Error fetching manager activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch managers" },
      { status: 500 },
    );
  }
}
