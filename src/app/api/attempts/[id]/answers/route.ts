import { auth } from "@/lib/auth";
import { examAnswerJson } from "@/lib/helper/exam-json";
import {
  choiceCorrectness,
  findAttemptOwner,
  recordExamAnswer,
} from "@/server/data/attempts";
import { licensedOnAttempt } from "@/server/data/exam-results";
import { PASSED_LOCK_BODY } from "@/lib/helper/licensing";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: attemptId } = await params;

  try {
    // check ownership before writing anything
    const userId = await findAttemptOwner(attemptId);

    if (!userId) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (await licensedOnAttempt(attemptId)) {
      return NextResponse.json(PASSED_LOCK_BODY, { status: 403 });
    }

    const body = await req.json();
    const { question_id, selected_choice_id } = body;

    if (!question_id || !selected_choice_id) {
      return NextResponse.json(
        { error: "question_id and selected_choice_id are required" },
        { status: 400 },
      );
    }

    const isCorrect = await choiceCorrectness(selected_choice_id, question_id);

    if (isCorrect === null) {
      return NextResponse.json(
        { error: "Choice not found for this question" },
        { status: 404 },
      );
    }

    const saved = await recordExamAnswer({
      attemptId,
      userId,
      questionId: question_id,
      selectedChoiceId: selected_choice_id,
      isCorrect,
    });

    return NextResponse.json(examAnswerJson(saved), { status: 201 });
  } catch (error) {
    console.error("Error submitting answer:", error);
    return NextResponse.json(
      { error: "Failed to submit answer" },
      { status: 500 },
    );
  }
}
