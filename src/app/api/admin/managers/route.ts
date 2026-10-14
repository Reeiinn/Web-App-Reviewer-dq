import { listManagers, touchLastSeen } from "@/server/data/staff";
import { auth } from "@/lib/auth";
import { presenceStatus } from "@/lib/helper/presence";
import { NextResponse } from "next/server";

/**
 * Unit managers and when each one last opened the app.
 *
 * Admin-only. A manager comparing themselves against their peers is a
 * different feature with a different conversation behind it, so MANAGER is
 * refused here even though it is allowed on the roster.
 *
 * last_seen_at is written by the routes the console calls, so it says the
 * account loaded a screen — not that anyone is looking at one now. The
 * reviewee count rides along because the join is already there, and "opened
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
    const managers = (await listManagers()).map((row) => {
      // Settling on an ISO string here keeps the shape the same whether a
      // caller reads it or JSON does.
      const lastSeenAt = row.lastSeenAt ? row.lastSeenAt.toISOString() : null;

      return {
        id: row.id,
        name: row.name,
        email: row.email,
        image: row.image ?? null,
        // Null for an account that has not made a request since the column
        // was added, which reads the same as never having opened the app.
        lastSeenAt,
        status: presenceStatus(lastSeenAt),
        reviewees: row.reviewees,
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
