import { auth } from "@/lib/auth";
import { firstIssue, focusTracksBody } from "@/lib/helper/focus-tracks";
import { getFocusTracks, setFocusTracks } from "@/server/data/focus-tracks";
import { markedTrackMessage } from "@/lib/helper/exam-choice";
import { NextResponse } from "next/server";

/**
 * The tracks a reviewee is focused on, chosen from their settings. Staff
 * accounts oversee rather than study, and their progress is never shown, so
 * they have no focus to set.
 */
async function reviewee(): Promise<{ error: NextResponse } | { userId: string }> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "USER") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { userId: session.user.id };
}

export async function GET() {
  const caller = await reviewee();
  if ("error" in caller) return caller.error;

  try {
    return NextResponse.json(await getFocusTracks(caller.userId));
  } catch (error) {
    console.error("Error fetching focus tracks:", error);
    return NextResponse.json({ error: "Failed to fetch focus tracks" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const caller = await reviewee();
  if ("error" in caller) return caller.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = focusTracksBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  try {
    // A recorded licensing result has to keep pointing at an exam the
    // reviewee still has. The picker locks those boxes; this is the rule
    // behind the lock.
    const saved = await setFocusTracks(caller.userId, parsed.data.tracks);
    if ("dropped" in saved) {
      return NextResponse.json(
        { error: markedTrackMessage(saved.dropped) },
        { status: 409 },
      );
    }

    return NextResponse.json(saved);
  } catch (error) {
    console.error("Error saving focus tracks:", error);
    return NextResponse.json({ error: "Failed to save focus tracks" }, { status: 500 });
  }
}
