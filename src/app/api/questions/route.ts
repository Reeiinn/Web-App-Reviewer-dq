import { getQuestions } from "@/app/api/_lib/questions";
import { auth } from "@/lib/auth";
import { withoutAnswers } from "@/lib/helper/answer-key";
import { isExamType } from "@/lib/types/common";
import { NextResponse } from "next/server";

/**
 * The questions without their answers. Sittings are scored on the server, so
 * a reviewee sitting one has no need of them; see /api/questions/answers.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const examType = searchParams.get("exam_type") || null;
  const category = searchParams.get("category");

  if (examType !== null && !isExamType(examType)) {
    return NextResponse.json({ error: "exam_type is invalid" }, { status: 400 });
  }

  try {
    const rows = await getQuestions(examType, category);
    return NextResponse.json(withoutAnswers(rows));
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 },
    );
  }
}
