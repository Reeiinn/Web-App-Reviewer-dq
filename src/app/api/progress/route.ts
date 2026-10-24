import { auth } from "@/lib/auth";
import type { MasteryCounts } from "@/lib/helper/readiness";
import { PASSES_REQUIRED, cappedPasses } from "@/lib/helper/practice-exam";
import { getFocusTracks } from "@/server/data/focus-tracks";
import { getTrackCounts } from "@/server/data/mastery";
import { NextResponse } from "next/server";

/** Unrounded share mastered; the overall figure averages these before rounding. */
const share = ({ mastered, total }: MasteryCounts) =>
  total > 0 ? (mastered / total) * 100 : 0;

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Only the tracks the reviewee is focused on; with none chosen, all four.
    const [counts, focus] = await Promise.all([
      getTrackCounts(session.user.id),
      getFocusTracks(session.user.id),
    ]);
    const tracks = counts.filter((t) => focus.tracks.includes(t.examType));

    const summary = tracks.map((t) => {
      const flashcardPct = share(t.flashcards);
      const memorizePct = share(t.memorization);
      const practicePct = share(t.practice);

      return {
        exam_type: t.examType,
        last_activity_at: t.lastReviewedAt
          ? t.lastReviewedAt.toISOString()
          : null,
        flashcard_pct: Math.round(flashcardPct),
        memorize_pct: Math.round(memorizePct),
        practice_exam_pct: Math.round(practicePct),
        overall_pct: Math.round((flashcardPct + memorizePct + practicePct) / 3),
        // Passing sittings per track: what the x / 5 counter reads, and the
        // only thing that decides whether a track is passed.
        exam_passes: cappedPasses(t.passingAttempts),
        passes_required: PASSES_REQUIRED,
      };
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching progress summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress summary" },
      { status: 500 },
    );
  }
}
