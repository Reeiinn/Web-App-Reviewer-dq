import { auth } from "@/lib/auth";
import { fetchRecent } from "@/app/api/_lib/recent-activity-store";
import { NextResponse } from "next/server";

const QUICK_ACCESS_LIMIT = 3;

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(
      await fetchRecent(session.user.id, QUICK_ACCESS_LIMIT),
    );
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent activity" },
      { status: 500 },
    );
  }
}
