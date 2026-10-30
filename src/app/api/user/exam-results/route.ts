import { auth } from "@/lib/auth";
import { outcomesFor } from "@/server/data/exam-results";
import { NextResponse } from "next/server";

/**
 * The signed-in reviewee's own licensing results, as staff recorded them.
 *
 * Read by the dashboard (a passed exam turns view-only, a failed one reads as
 * retaking) and by the exam picker, which keeps a marked exam ticked. Staff
 * read results through the console instead.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "USER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    return NextResponse.json({ results: await outcomesFor(session.user.id) });
  } catch (error) {
    console.error("Error fetching exam results:", error);
    return NextResponse.json(
      { error: "Failed to fetch exam results" },
      { status: 500 },
    );
  }
}
