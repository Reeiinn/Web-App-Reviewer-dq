import { auth } from "@/lib/auth";
import { firstIssue, focusTracksBody } from "@/lib/helper/focus-tracks";
import { getFocusTracks, setFocusTracks } from "@/server/data/focus-tracks";
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
    return NextResponse.json(await setFocusTracks(caller.userId, parsed.data.tracks));
  } catch (error) {
    console.error("Error saving focus tracks:", error);
    return NextResponse.json({ error: "Failed to save focus tracks" }, { status: 500 });
  }
}
