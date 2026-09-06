import { auth } from "@/lib/auth";
import { fetchStreaks } from "@/app/api/_lib/streak-store";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await fetchStreaks(session.user.id));
  } catch (error) {
    console.error("Error fetching streaks:", error);
    return NextResponse.json(
      { error: "Failed to fetch streaks" },
      { status: 500 },
    );
  }
}
