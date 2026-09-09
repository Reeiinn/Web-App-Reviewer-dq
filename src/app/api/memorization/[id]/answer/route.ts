import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: memorizationId } = await params;

  try {
    const body = await req.json();
    const { user_id, selected_choice_id } = body;

    if (!user_id || !selected_choice_id) {
      return NextResponse.json(
        { error: "user_id and selected_choice_id are required" },
        { status: 400 },
      );
    }

    const choiceResult = await pool.query(
      `SELECT is_correct FROM memorization_choices 
       WHERE id = $1 AND memorization_id = $2`,
      [selected_choice_id, memorizationId],
    );

    if (choiceResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Choice not found for this memorization item" },
        { status: 404 },
      );
    }

    const isCorrect = choiceResult.rows[0].is_correct;

    // Mastery is sticky here for the same reason it is on
    // POST /api/memorization/[id]/progress: a later wrong answer records itself
    // in is_correct without taking back an item the learner has already had right.
    const result = await pool.query(
      `INSERT INTO memorization_progress
        (user_id, memorization_id, selected_choice_id, is_correct, reviewed_at, mastered)
       VALUES ($1, $2, $3, $4, now(), $4)
       ON CONFLICT (user_id, memorization_id)
       DO UPDATE SET
         selected_choice_id = EXCLUDED.selected_choice_id,
         is_correct = EXCLUDED.is_correct,
         reviewed_at = now(),
         mastered = memorization_progress.mastered OR EXCLUDED.mastered
       RETURNING *`,
      [user_id, memorizationId, selected_choice_id, isCorrect],
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error submitting memorization answer:", error);
    return NextResponse.json(
      { error: "Failed to submit answer" },
      { status: 500 },
    );
  }
}
