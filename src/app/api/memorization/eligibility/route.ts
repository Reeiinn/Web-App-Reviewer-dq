// app/api/memorization/eligibility/route.ts
import { auth } from "@/lib/auth";
import { isExamType } from "@/lib/types/common";
import { getTrackCount } from "@/server/data/mastery";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const examType = new URL(req.url).searchParams.get("exam_type");

  if (!examType) {
    return NextResponse.json(
      { error: "exam_type is required" },
      { status: 400 },
    );
  }
  if (!isExamType(examType)) {
    return NextResponse.json(
      { error: "exam_type is invalid" },
      { status: 400 },
    );
  }

  try {
    const { total, mastered } = (await getTrackCount(session.user.id, examType))
      .memorization;
    return NextResponse.json({
      eligible: total > 0 && total === mastered,
      total,
      mastered,
    });
  } catch (error) {
    console.error("Error checking memorization eligibility:", error);
    return NextResponse.json(
      { error: "Failed to check eligibility" },
      { status: 500 },
    );
  }
}
