import { auth } from "@/lib/auth";
import { resultTotals } from "@/lib/helper/licensing";
import { examTypes, isExamType, type ExamType } from "@/lib/types/common";
import type { ExamResults, LicensingOutcome } from "@/lib/types/exam-results";
import { resultsFor } from "@/server/data/exam-results";
import { getFocusTracksFor } from "@/server/data/focus-tracks";
import { listReviewees, touchLastSeen } from "@/server/data/staff";
import { NextResponse } from "next/server";

/**
 * Every recorded licensing result, for the results page.
 *
 * Scoped exactly like the roster: a Sales Manager sees everyone, a Unit
 * Manager their own recruits. Accepts ?outcome=PASSED|FAILED and
 * ?exam_type=<track>. The totals ignore both filters, so the tiles keep
 * saying where the whole cohort stands while the table narrows.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, id: currentUserId } = session.user;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await touchLastSeen(currentUserId);

  const params = new URL(req.url).searchParams;
  const outcomeParam = params.get("outcome");
  const outcome: LicensingOutcome | null =
    outcomeParam === "PASSED" || outcomeParam === "FAILED" ? outcomeParam : null;
  const examParam = params.get("exam_type");
  const examType: ExamType | null = isExamType(examParam) ? examParam : null;

  try {
    const reviewees = await listReviewees(role === "ADMIN" ? null : currentUserId);
    const ids = reviewees.map((row) => row.id);
    const [marks, focus] = await Promise.all([
      resultsFor(ids),
      getFocusTracksFor(ids),
    ]);

    const totals = resultTotals(
      reviewees.map((row) => {
        const own = marks.get(row.id) ?? {};
        const results: ExamResults = {};
        for (const track of examTypes) {
          const mark = own[track];
          if (mark) results[track] = mark.outcome;
        }
        const pick = focus.get(row.id);
        return { examTracks: pick?.chosen ? pick.tracks : null, results };
      }),
    );

    const rows = reviewees
      .flatMap((row) =>
        examTypes.flatMap((track) => {
          const mark = marks.get(row.id)?.[track];
          if (!mark) return [];
          if (outcome && mark.outcome !== outcome) return [];
          if (examType && track !== examType) return [];
          return [
            {
              revieweeId: row.id,
              name: row.name,
              email: row.email,
              image: row.image,
              examType: track,
              outcome: mark.outcome,
              markedBy: mark.markedBy,
              markedByRole: mark.markedByRole,
              markedAt: mark.markedAt,
            },
          ];
        }),
      )
      .sort((a, b) => b.markedAt.localeCompare(a.markedAt));

    return NextResponse.json({ rows, totals });
  } catch (error) {
    console.error("Error fetching exam results:", error);
    return NextResponse.json(
      { error: "Failed to fetch results" },
      { status: 500 },
    );
  }
}
