// app/api/memorization/[id]/progress/route.ts
import { auth } from "@/lib/auth";
import {
  applyStreak,
  choiceBelongsTo,
  findMemorizationTrack,
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
    const { selected_choice_id, is_correct, mastered } = body;

    if (
      !selected_choice_id ||
      typeof is_correct !== "boolean" ||
      typeof mastered !== "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "selected_choice_id, is_correct, and mastered (boolean) are required",
        },
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

    if (!(await choiceBelongsTo(selected_choice_id, memorizationId))) {
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
      isCorrect: is_correct,
      mastered,
    });

    // Returned with the answer so the client can celebrate without a second call.
    const streak = await applyStreak(session.user.id, examType, is_correct);

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
