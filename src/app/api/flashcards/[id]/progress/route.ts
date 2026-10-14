// app/api/flashcards/[id]/progress/route.ts
import { auth } from "@/lib/auth";
import {
  applyStreak,
  findFlashcardTrack,
  recordFlashcardReview,
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

  const { id: flashcardId } = await params;

  try {
    const body = await req.json();
    const { mastered } = body;

    if (typeof mastered !== "boolean") {
      return NextResponse.json(
        { error: "mastered (boolean) is required" },
        { status: 400 },
      );
    }

    const examType = await findFlashcardTrack(flashcardId);

    if (!examType) {
      return NextResponse.json(
        { error: "Flashcard not found" },
        { status: 404 },
      );
    }

    const review = await recordFlashcardReview(
      session.user.id,
      flashcardId,
      mastered,
    );

    // Returned with the answer so the client can celebrate without a second call.
    const streak = await applyStreak(session.user.id, examType, mastered);

    return NextResponse.json({
      id: review.id,
      user_id: review.userId,
      flashcard_id: review.flashcardId,
      reviewed_at: review.reviewedAt,
      mastered: review.mastered,
      streak,
    });
  } catch (error) {
    console.error("Error submitting flashcard review:", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 },
    );
  }
}
