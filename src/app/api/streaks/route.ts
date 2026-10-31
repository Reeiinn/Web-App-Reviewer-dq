import { auth } from "@/lib/auth";
import { getFocusTracks } from "@/server/data/focus-tracks";
import { fetchStreaks } from "@/server/data/progress";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const focus = await getFocusTracks(session.user.id);
    return NextResponse.json(await fetchStreaks(session.user.id, focus.tracks));
  } catch (error) {
    console.error("Error fetching streaks:", error);
    return NextResponse.json(
      { error: "Failed to fetch streaks" },
      { status: 500 },
    );
  }
}
