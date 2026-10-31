import { auth } from "@/lib/auth";
import { isExamType } from "@/lib/types/common";
import { listFinishedAttempts } from "@/server/data/attempts";
import { NextResponse } from "next/server";

/**
 * The signed-in reviewee's finished practice sittings on one track, newest
 * first, for the past-exams list. Each one opens through GET
 * /api/attempts/[id], which already returns the paper's answers.
 *
 * Kept off GET /api/attempts, which was removed when nothing called it.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const examType = new URL(req.url).searchParams.get("exam_type");
  if (!isExamType(examType)) {
    return NextResponse.json({ error: "exam_type is invalid" }, { status: 400 });
  }

  try {
    const sittings = await listFinishedAttempts(session.user.id, examType);
    return NextResponse.json(
      sittings.map((row) => ({
        id: row.id,
        score: row.score,
        total_items: row.totalItems,
        passed: row.passed,
        completed_at: row.completedAt.toISOString(),
      })),
    );
  } catch (error) {
    console.error("Error fetching past sittings:", error);
    return NextResponse.json(
      { error: "Failed to fetch past sittings" },
      { status: 500 },
    );
  }
}
