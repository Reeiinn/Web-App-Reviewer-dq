// app/api/flashcards/[id]/progress/route.ts
import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { applyStreak } from "@/app/api/_lib/streak-store";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: flashcardId } = await params;

  try {
    const body = await req.json();
    const { mastered } = body;

    if (typeof mastered !== "boolean") {
      return NextResponse.json(
        { error: "mastered (boolean) is required" },
        { status: 400 },
      );
    }

    const cardCheck = await pool.query(
      `SELECT id, exam_type FROM flashcards WHERE id = $1`,
      [flashcardId],
    );

    if (cardCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Flashcard not found" },
        { status: 404 },
      );
    }

    const result = await pool.query(
      `INSERT INTO flashcard_progress
        (user_id, flashcard_id, reviewed_at, mastered)
       VALUES ($1, $2, now(), $3)
       ON CONFLICT (user_id, flashcard_id)
       DO UPDATE SET
         reviewed_at = now(),
         mastered = EXCLUDED.mastered
       RETURNING *`,
      [session.user.id, flashcardId, mastered],
    );

    // Returned with the answer so the client can celebrate without a second call.
    const streak = await applyStreak(
      session.user.id,
      cardCheck.rows[0].exam_type,
      mastered,
    );

    return NextResponse.json({ ...result.rows[0], streak });
  } catch (error) {
    console.error("Error submitting flashcard review:", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 },
    );
  }
}
