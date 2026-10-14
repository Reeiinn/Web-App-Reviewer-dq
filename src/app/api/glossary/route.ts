import { auth } from "@/lib/auth";
import { isExamType, type ExamType } from "@/lib/types/common";
import { listGlossary } from "@/server/data/content";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

// Search happens on the glossary page, over the whole list, so this route
// only ever filters by track. `details` (examples, key points) is what the
// term cards render beneath the definition.
const getVocabulary = unstable_cache(
  async (examType: ExamType | null) => listGlossary(examType),
  ["vocabulary"],
  { tags: ["vocabulary"] },
);

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const examType = new URL(req.url).searchParams.get("exam_type") || null;

  if (examType !== null && !isExamType(examType)) {
    return NextResponse.json({ error: "exam_type is invalid" }, { status: 400 });
  }

  try {
    return NextResponse.json(await getVocabulary(examType));
  } catch (error) {
    console.error("Error fetching glossary terms:", error);

    return NextResponse.json(
      { error: "Failed to fetch glossary terms" },
      { status: 500 },
    );
  }
}
