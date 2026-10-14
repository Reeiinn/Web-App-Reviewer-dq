import { auth } from "@/lib/auth";
import { isExamType } from "@/lib/types/common";
import { listMemorization } from "@/server/data/content";
import { NextResponse } from "next/server";

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
    // The learner's own last answer rides along with the item, so a resumed
    // sitting can show a question they already answered exactly as they left
    // it rather than blank and answerable a second time.
    return NextResponse.json(
      await listMemorization(session.user.id, { examType, category }),
    );
  } catch (error) {
    console.error("Error fetching memorization:", error);
    return NextResponse.json(
      { error: "Failed to fetch memorization" },
      { status: 500 },
    );
  }
}
