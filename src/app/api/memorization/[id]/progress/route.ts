// app/api/memorization/[id]/progress/route.ts
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

  const { id: memorizationId } = await params;

  try {
    const body = await req.json();
    const { selected_choice_id, is_correct, mastered } = body;

    if (
      !selected_choice_id ||
      typeof is_correct !== "boolean" ||
      typeof mastered !== "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "selected_choice_id, is_correct, and mastered (boolean) are required",
        },
        { status: 400 },
      );
    }

    // Confirm the memorization item exists
    const itemCheck = await pool.query(
      `SELECT id, exam_type FROM memorization WHERE id = $1`,
      [memorizationId],
    );

    if (itemCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Memorization item not found" },
        { status: 404 },
      );
    }

    // Confirm the selected choice belongs to this memorization item
    const choiceCheck = await pool.query(
      `SELECT id FROM memorization_choices WHERE id = $1 AND memorization_id = $2`,
      [selected_choice_id, memorizationId],
    );

    if (choiceCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Choice not found for this memorization item" },
        { status: 404 },
      );
    }

    const result = await pool.query(
      `INSERT INTO memorization_progress 
        (user_id, memorization_id, selected_choice_id, is_correct, reviewed_at, mastered)
       VALUES ($1, $2, $3, $4, now(), $5)
       ON CONFLICT (user_id, memorization_id) 
       DO UPDATE SET 
         selected_choice_id = EXCLUDED.selected_choice_id,
         is_correct = EXCLUDED.is_correct,
         reviewed_at = now(),
         mastered = EXCLUDED.mastered
       RETURNING *`,
      [
        session.user.id,
        memorizationId,
        selected_choice_id,
        is_correct,
        mastered,
      ],
    );

    // Returned with the answer so the client can celebrate without a second call.
    const streak = await applyStreak(
      session.user.id,
      itemCheck.rows[0].exam_type,
      is_correct,
    );

    return NextResponse.json({ ...result.rows[0], streak });
  } catch (error) {
    console.error("Error submitting memorization review:", error);
    return NextResponse.json(
      { error: "Failed to submit review" },
      { status: 500 },
    );
  }
}
