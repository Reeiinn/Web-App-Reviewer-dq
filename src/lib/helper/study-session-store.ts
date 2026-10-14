import { auth } from "@/lib/auth";
import { clearSession, loadSession, saveSession } from "@/server/data/progress";
import type { SavedSession } from "@/lib/helper/study-session";
import { examTypes, type ExamType } from "@/lib/types/common";
import type { StudyMode } from "@/lib/types/study";
import { NextResponse } from "next/server";

/**
 * The saved-session routes. The deck position itself lives in
 * src/server/data/progress.ts: one row per learner, track and study mode,
 * replaced on every answer, deleted when the deck is finished or restarted.
 *
 * Flashcards and memorization save the same shape — the order the learner saw,
 * how far they got, and what they scored — so both routes are this one handler
 * set bound to a different mode.
 */

const isExamType = (value: unknown): value is ExamType =>
  typeof value === "string" && examTypes.includes(value as ExamType);

/** Rejects a body that is not a deck position we could resume into. */
function parseSession(body: unknown): SavedSession | null {
  if (!body || typeof body !== "object") return null;

  const {
    card_order: order,
    card_index: index,
    ratings,
  } = body as Record<string, unknown>;

  if (!Array.isArray(order) || order.some((id) => typeof id !== "string")) {
    return null;
  }

  if (typeof index !== "number" || !Number.isInteger(index) || index < 0) {
    return null;
  }

  if (!ratings || typeof ratings !== "object" || Array.isArray(ratings)) {
    return null;
  }

  const entries = Object.entries(ratings as Record<string, unknown>);
  if (entries.some(([, value]) => typeof value !== "boolean")) return null;

  return {
    card_order: order as string[],
    card_index: index,
    ratings: Object.fromEntries(entries) as Record<string, boolean>,
  };
}

function examTypeOf(req: Request): ExamType | null {
  const value = new URL(req.url).searchParams.get("exam_type");
  return isExamType(value) ? value : null;
}

/** The GET/PUT/DELETE handlers for one study mode's saved session. */
export function studySessionRoute(mode: StudyMode) {
  const unauthorized = () =>
    NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const missingType = () =>
    NextResponse.json({ error: "exam_type is required" }, { status: 400 });

  return {
    async GET(req: Request) {
      const session = await auth();
      if (!session?.user) return unauthorized();

      const examType = examTypeOf(req);
      if (!examType) return missingType();

      try {
        // null is a valid answer: the learner has no deck in progress.
        return NextResponse.json(
          await loadSession(session.user.id, examType, mode),
        );
      } catch (error) {
        console.error(`Error loading ${mode} session:`, error);
        return NextResponse.json(
          { error: "Failed to load session" },
          { status: 500 },
        );
      }
    },

    async PUT(req: Request) {
      const session = await auth();
      if (!session?.user) return unauthorized();

      const examType = examTypeOf(req);
      if (!examType) return missingType();

      try {
        const saved = parseSession(await req.json());

        if (!saved) {
          return NextResponse.json(
            { error: "card_order, card_index and ratings are required" },
            { status: 400 },
          );
        }

        await saveSession(session.user.id, examType, mode, saved);
        return NextResponse.json(saved);
      } catch (error) {
        console.error(`Error saving ${mode} session:`, error);
        return NextResponse.json(
          { error: "Failed to save session" },
          { status: 500 },
        );
      }
    },

    async DELETE(req: Request) {
      const session = await auth();
      if (!session?.user) return unauthorized();

      const examType = examTypeOf(req);
      if (!examType) return missingType();

      try {
        await clearSession(session.user.id, examType, mode);
        return NextResponse.json({ cleared: true });
      } catch (error) {
        console.error(`Error clearing ${mode} session:`, error);
        return NextResponse.json(
          { error: "Failed to clear session" },
          { status: 500 },
        );
      }
    },
  };
}
