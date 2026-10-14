import { auth } from "@/lib/auth";
import { attemptJson, reviewedAnswerJson } from "@/lib/helper/exam-json";
import { findAttempt, listAttemptAnswers } from "@/server/data/attempts";
import { isActiveRecruit } from "@/server/data/users";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { role, id: currentUserId } = session.user;

  try {
    const attempt = await findAttempt(id);

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // ownership / access check
    if (role === "ADMIN") {
      // no restriction
    } else if (role === "MANAGER") {
      const isOwnAttempt = attempt.userId === currentUserId;
      if (!isOwnAttempt && !(await isActiveRecruit(attempt.userId, currentUserId))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (attempt.userId !== currentUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const answers = await listAttemptAnswers(id);

    return NextResponse.json({
      ...attemptJson(attempt),
      answers: answers.map(reviewedAnswerJson),
    });
  } catch (error) {
    console.error("Error fetching attempt:", error);
    return NextResponse.json(
      { error: "Failed to fetch attempt" },
      { status: 500 },
    );
  }
}
