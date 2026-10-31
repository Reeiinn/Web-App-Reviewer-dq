import { auth } from "@/lib/auth";
import {
  isUuid,
  planRemoval,
  removeIdsError,
  removeIdsSchema,
} from "@/lib/helper/removal";
import {
  findActiveAccounts,
  recordAdminAction,
  removeReviewees,
  touchLastSeen,
} from "@/server/data/staff";
import { NextResponse } from "next/server";

const GONE = "That reviewee no longer exists.";

/**
 * Removes a ticked selection of reviewees in one go.
 *
 * Each account goes through the same rule as removing one. Whatever the
 * caller may remove is removed; the rest come back in `skipped` with the
 * reason, so a mixed selection is neither refused whole nor half-done
 * silently. Removal is the same soft delete, recorded once per account.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, id: currentUserId } = session.user;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await touchLastSeen(currentUserId);

  const body = removeIdsSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: removeIdsError(body.error) },
      { status: 400 },
    );
  }

  try {
    // A malformed id would fail the whole lookup; it names nobody, and
    // planRemoval reports it as such.
    const targets = new Map(
      (await findActiveAccounts(body.data.ids.filter(isUuid))).map((row) => [
        row.id,
        row,
      ]),
    );

    const plan = planRemoval({ id: currentUserId, role }, body.data.ids, targets);

    const stamped = new Set(
      await removeReviewees(plan.remove.map((target) => target.id)),
    );

    const removed = plan.remove.filter((target) => stamped.has(target.id));
    // Removed by another request between the lookup and the stamp: gone all
    // the same, and named here rather than left out of both lists.
    const raced = plan.remove
      .filter((target) => !stamped.has(target.id))
      .map((target) => ({ id: target.id, name: target.name, reason: GONE }));

    for (const target of removed) {
      await recordAdminAction({
        actor: {
          id: currentUserId,
          email: session.user.email ?? "unknown",
          role,
        },
        action: "reviewee.removed",
        target: { id: target.id, email: target.email, name: target.name },
      });
    }

    return NextResponse.json({
      removed: removed.map(({ id, name }) => ({ id, name })),
      skipped: [...plan.skipped, ...raced],
    });
  } catch (error) {
    console.error("Error removing reviewees:", error);
    return NextResponse.json(
      { error: "Failed to remove reviewees" },
      { status: 500 },
    );
  }
}
