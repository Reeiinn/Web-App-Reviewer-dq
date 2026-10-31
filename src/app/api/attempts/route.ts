import { auth } from "@/lib/auth";
import { lockReason } from "@/lib/helper/eligibility";
import { attemptJson } from "@/lib/helper/exam-json";
import { fetchEligibility } from "@/app/api/_lib/mastery";
import { isExamType } from "@/lib/types/common";
import { openAttempt } from "@/server/data/attempts";
import { outcomeFor } from "@/server/data/exam-results";
import { PASSED_LOCK_BODY, practiceLocked } from "@/lib/helper/licensing";
import { NextResponse } from "next/server";

/**
 * Opens the practice exam on a track: the unfinished sitting if there is one
 * (200), otherwise a new one with its paper dealt (201). There is no GET:
 * the list it served had no callers and was removed in the Prisma move.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { exam_type } = body;

    if (!exam_type) {
      return NextResponse.json(
        { error: "exam_type is required" },
        { status: 400 },
      );
    }
    if (!isExamType(exam_type)) {
      return NextResponse.json(
        { error: "exam_type is invalid" },
        { status: 400 },
      );
    }

    // Ahead of the study gate: a reviewee who passed the real exam is told so,
    // not that their decks are unfinished. It also stops an open sitting
    // being resumed once the pass is recorded.
    if (practiceLocked(await outcomeFor(session.user.id, exam_type))) {
      return NextResponse.json(PASSED_LOCK_BODY, { status: 403 });
    }

    // The UI locks the entry point, but the gate has to live here too — the
    // lock is presentation, this is the rule.
    const eligibility = await fetchEligibility(session.user.id, exam_type);

    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          error:
            lockReason(eligibility.flashcards, eligibility.memorization) ??
            "You are not eligible for this practice exam yet.",
          eligibility,
        },
        { status: 403 },
      );
    }

    const { attempt, created } = await openAttempt(session.user.id, exam_type);
    return NextResponse.json(
      attemptJson(attempt),
      created ? { status: 201 } : undefined,
    );
  } catch (error) {
    console.error("Error starting attempt:", error);
    return NextResponse.json(
      { error: "Failed to start attempt" },
      { status: 500 },
    );
  }
}
