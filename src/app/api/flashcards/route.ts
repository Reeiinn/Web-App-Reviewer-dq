import { auth } from "@/lib/auth";
import { isExamType, type ExamType } from "@/lib/types/common";
import { listFlashcards } from "@/server/data/content";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

const getFlashcards = unstable_cache(
  async (examType: ExamType | null, category: string | null) =>
    listFlashcards({ examType, category }),
  ["flashcards"],
  { tags: ["flashcards"] },
);

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const examType = searchParams.get("exam_type") || null;
  const category = searchParams.get("category");

  if (examType !== null && !isExamType(examType)) {
    return NextResponse.json({ error: "exam_type is invalid" }, { status: 400 });
  }

  try {
    const rows = await getFlashcards(examType, category);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching flashcards:", error);

    return NextResponse.json(
      { error: "Failed to fetch flashcards" },
      { status: 500 },
    );
  }
}
