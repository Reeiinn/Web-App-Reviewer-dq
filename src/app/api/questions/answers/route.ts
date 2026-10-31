import { getQuestions } from "@/app/api/_lib/questions";
import { auth } from "@/lib/auth";
import { answerKeyAccess } from "@/lib/helper/answer-key";
import { practiceLocked } from "@/lib/helper/licensing";
import { isExamType } from "@/lib/types/common";
import { sittingStanding } from "@/server/data/attempts";
import { outcomeFor } from "@/server/data/exam-results";
import { NextResponse } from "next/server";

/**
 * One track's questions with their answers, for the result screen and the
 * reviews. The rule for who may read them is answerKeyAccess; the UI opening
 * a review is presentation, this is what stands behind it.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const examType = new URL(request.url).searchParams.get("exam_type");
  if (!examType) {
    return NextResponse.json({ error: "exam_type is required" }, { status: 400 });
  }
  if (!isExamType(examType)) {
    return NextResponse.json({ error: "exam_type is invalid" }, { status: 400 });
  }

  const { id: userId, role } = session.user;

  try {
    const [outcome, standing] = await Promise.all([
      outcomeFor(userId, examType),
      sittingStanding(userId, examType),
    ]);

    const access = answerKeyAccess({
      role,
      licensed: practiceLocked(outcome),
      ...standing,
    });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    return NextResponse.json(await getQuestions(examType, null));
  } catch (error) {
    console.error("Error fetching the answer key:", error);
    return NextResponse.json(
      { error: "Failed to fetch the answers" },
      { status: 500 },
    );
  }
}
