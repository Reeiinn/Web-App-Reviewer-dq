import { auth } from "@/lib/auth";
import {
  findActiveAccount,
  recordAdminAction,
  removeReviewee,
  touchLastSeen,
} from "@/server/data/staff";
import { removalDecision } from "@/lib/helper/removal";
import { NextResponse } from "next/server";

/**
 * Removes a reviewee. A soft delete: deleted_at is stamped, every read
 * filters on it, and their progress, attempts and streaks stay so they can
 * be restored.
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

  try {
    const user = await findActiveAccount(id);

    // Shared with removing a ticked selection, so one row and many answer
    // to exactly the same rule.
    const decision = removalDecision({ id: currentUserId, role }, id, user ?? undefined);
    if (!decision.ok || !user) {
      return NextResponse.json(
        { error: decision.ok ? "That reviewee no longer exists." : decision.reason },
        { status: decision.ok ? 404 : decision.status },
      );
    }

    // Two removals racing both get here; only the one that stamped the row
    // records it, so the audit log says it once.
    if (await removeReviewee(id)) {
      await recordAdminAction({
        actor: {
          id: currentUserId,
          email: session.user.email ?? "unknown",
          role,
        },
        action: "reviewee.removed",
        target: { id: user.id, email: user.email, name: user.name },
      });
    }

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
