import { auth } from "@/lib/auth";
import { canMarkResult, resultMarkSchema } from "@/lib/helper/licensing";
import { clearResult, markResult, resultsFor } from "@/server/data/exam-results";
import { getFocusTracks } from "@/server/data/focus-tracks";
import {
  findActiveAccount,
  recordAdminAction,
  touchLastSeen,
} from "@/server/data/staff";
import { NextResponse } from "next/server";

/**
 * Records, changes or clears how a reviewee did on one real licensing exam.
 *
 * Same reach as removal: a Sales Manager marks anyone, a Unit Manager only
 * their own recruits, and only on an exam the reviewee picked. Every change
 * is written to admin_actions with what it replaced, so a mark set by mistake
 * can be traced as well as undone.
 */
export async function PUT(
  req: Request,
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

  const body = resultMarkSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { error: "Choose an exam and a result." },
      { status: 400 },
    );
  }
  const { examType, outcome } = body.data;

  try {
    const user = await findActiveAccount(id);
    const focus = user ? await getFocusTracks(id) : null;

    const verdict = canMarkResult(
      { id: currentUserId, role },
      user
        ? {
            role: user.role,
            managerId: user.managerId,
            // All four before a pick is a default, not a choice a result
            // could belong to.
            examTracks: focus?.chosen ? focus.tracks : null,
          }
        : undefined,
      examType,
      { clearing: outcome === null },
    );
    if (!verdict.ok || !user) {
      return NextResponse.json(
        { error: verdict.ok ? "That reviewee no longer exists." : verdict.error },
        { status: verdict.ok ? 404 : verdict.status },
      );
    }

    const previous =
      outcome === null
        ? await clearResult(id, examType)
        : await markResult({
            userId: id,
            examType,
            outcome,
            markedBy: currentUserId,
          });

    // Clearing a mark that was not there changed nothing worth recording.
    if (outcome !== null || previous !== null) {
      await recordAdminAction({
        actor: {
          id: currentUserId,
          email: session.user.email ?? "unknown",
          role,
        },
        action:
          outcome === null ? "reviewee.result_cleared" : "reviewee.result_marked",
        target: { id: user.id, email: user.email, name: user.name },
        detail: { examType, outcome, previous },
      });
    }

    return NextResponse.json({
      results: (await resultsFor([id])).get(id) ?? {},
    });
  } catch (error) {
    console.error("Error recording exam result:", error);
    return NextResponse.json(
      { error: "Failed to record the result" },
      { status: 500 },
    );
  }
}
