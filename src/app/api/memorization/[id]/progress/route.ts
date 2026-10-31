// app/api/memorization/[id]/progress/route.ts
import { auth } from "@/lib/auth";
import {
  applyStreak,
  findMemorizationTrack,
  memorizationChoiceCorrectness,
  recordMemorizationAnswer,
} from "@/server/data/progress";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: memorizationId } = await params;

  try {
    const body = await req.json();
    const { selected_choice_id } = body;

    if (typeof selected_choice_id !== "string" || !selected_choice_id) {
      return NextResponse.json(
        { error: "selected_choice_id is required" },
        { status: 400 },
      );
    }

    const examType = await findMemorizationTrack(memorizationId);

    if (!examType) {
      return NextResponse.json(
        { error: "Memorization item not found" },
        { status: 404 },
      );
    }

    // Marked here, whatever the client claims: mastery opens the practice exam.
    const isCorrect = await memorizationChoiceCorrectness(
      selected_choice_id,
      memorizationId,
    );

    if (isCorrect === null) {
      return NextResponse.json(
        { error: "Choice not found for this memorization item" },
        { status: 404 },
      );
    }

    // Mastery only ever goes up (see recordMemorizationAnswer): a learner
    // working through the deck again watches the count rise rather than
    // trade newly-learnt items for freshly-missed ones.
    const answer = await recordMemorizationAnswer({
      userId: session.user.id,
      memorizationId,
      selectedChoiceId: selected_choice_id,
      isCorrect,
      mastered: isCorrect,
    });

    // Returned with the answer so the client can celebrate without a second call.
    const streak = await applyStreak(session.user.id, examType, isCorrect);

    return NextResponse.json({
      id: answer.id,
      user_id: answer.userId,
      memorization_id: answer.memorizationId,
      selected_choice_id: answer.selectedChoiceId,
      is_correct: answer.isCorrect,
      reviewed_at: answer.reviewedAt,
      mastered: answer.mastered,
      streak,
    });
  } catch (error) {
    console.error("Error submitting memorization review:", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 },
    );
  }
}
