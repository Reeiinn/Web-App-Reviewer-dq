import { auth } from "@/lib/auth";
import { getFocusTracks } from "@/server/data/focus-tracks";
import { fetchRecent } from "@/server/data/progress";
import { NextResponse } from "next/server";

const QUICK_ACCESS_LIMIT = 3;

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const focus = await getFocusTracks(session.user.id);
    return NextResponse.json(
      await fetchRecent(session.user.id, QUICK_ACCESS_LIMIT, focus.tracks),
    );
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent activity" },
      { status: 500 },
    );
  }
}
