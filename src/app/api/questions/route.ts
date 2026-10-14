import { auth } from "@/lib/auth";
import { isExamType, type ExamType } from "@/lib/types/common";
import { listQuestions } from "@/server/data/content";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

const getQuestions = unstable_cache(
  async (examType: ExamType | null, category: string | null) =>
    listQuestions({ examType, category }),
  ["questions"],
  { tags: ["questions"] },
);

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
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 },
    );
  }
}
