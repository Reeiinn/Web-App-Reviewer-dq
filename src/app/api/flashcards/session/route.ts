import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import type { SavedSession } from "@/lib/helper/study-session";
import { examTypes, type ExamType } from "@/lib/types/common";
import type { StudyMode } from "@/lib/types/study";
import { NextResponse } from "next/server";

const MODE: StudyMode = "flashcard";

const isExamType = (value: unknown): value is ExamType =>
  typeof value === "string" && examTypes.includes(value as ExamType);

/**
 * Persisted deck position for one learner, track and study mode. One row per
 * combination, replaced on every answer, deleted when the deck is finished or
 * restarted.
 */
async function loadSession(
  userId: string,
  examType: ExamType,
  mode: StudyMode,
): Promise<SavedSession | null> {
  const result = await pool.query(
    `SELECT card_order, card_index, ratings FROM study_sessions
     WHERE user_id = $1 AND exam_type = $2 AND mode = $3`,
    [userId, examType, mode],
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    card_order: Array.isArray(row.card_order) ? row.card_order : [],
    card_index: Number(row.card_index) || 0,
    ratings: row.ratings && typeof row.ratings === "object" ? row.ratings : {},
  };
}

async function saveSession(
  userId: string,
  examType: ExamType,
  mode: StudyMode,
  saved: SavedSession,
): Promise<void> {
  await pool.query(
    `INSERT INTO study_sessions
       (user_id, exam_type, mode, card_order, card_index, ratings, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb, now())
     ON CONFLICT (user_id, exam_type, mode) DO UPDATE SET
       card_order = EXCLUDED.card_order,
       card_index = EXCLUDED.card_index,
       ratings    = EXCLUDED.ratings,
       updated_at = now()`,
    [
      userId,
      examType,
      mode,
      JSON.stringify(saved.card_order),
      saved.card_index,
      JSON.stringify(saved.ratings),
    ],
  );
}

async function clearSession(
  userId: string,
  examType: ExamType,
  mode: StudyMode,
): Promise<void> {
  await pool.query(
    `DELETE FROM study_sessions
     WHERE user_id = $1 AND exam_type = $2 AND mode = $3`,
    [userId, examType, mode],
  );
}

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

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const examType = examTypeOf(req);
  if (!examType) {
    return NextResponse.json(
      { error: "exam_type is required" },
      { status: 400 },
    );
  }

  try {
    // null is a valid answer: the learner has no deck in progress.
    return NextResponse.json(
      await loadSession(session.user.id, examType, MODE),
    );
  } catch (error) {
    console.error("Error loading flashcard session:", error);
    return NextResponse.json(
      { error: "Failed to load session" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const examType = examTypeOf(req);
  if (!examType) {
    return NextResponse.json(
      { error: "exam_type is required" },
      { status: 400 },
    );
  }

  try {
    const saved = parseSession(await req.json());

    if (!saved) {
      return NextResponse.json(
        { error: "card_order, card_index and ratings are required" },
        { status: 400 },
      );
    }

    await saveSession(session.user.id, examType, MODE, saved);
    return NextResponse.json(saved);
  } catch (error) {
    console.error("Error saving flashcard session:", error);
    return NextResponse.json(
      { error: "Failed to save session" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const examType = examTypeOf(req);
  if (!examType) {
    return NextResponse.json(
      { error: "exam_type is required" },
      { status: 400 },
    );
  }

  try {
    await clearSession(session.user.id, examType, MODE);
    return NextResponse.json({ cleared: true });
  } catch (error) {
    console.error("Error clearing flashcard session:", error);
    return NextResponse.json(
      { error: "Failed to clear session" },
      { status: 500 },
    );
  }
}
