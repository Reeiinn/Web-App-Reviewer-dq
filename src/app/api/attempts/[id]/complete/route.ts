import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import {
  PASSES_REQUIRED,
  cappedPasses,
  sittingPassed,
} from "@/lib/helper/practice-exam";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: attemptId } = await params;

  try {
    // fetch the attempt first to check ownership before mutating anything
    const attemptCheck = await pool.query(
      `SELECT user_id FROM exam_attempts WHERE id = $1`,
      [attemptId],
    );

    if (attemptCheck.rows.length === 0) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attemptCheck.rows[0].user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const answersResult = await pool.query(
      `SELECT is_correct FROM exam_attempt_answers WHERE attempt_id = $1`,
      [attemptId],
    );

    const totalItems = answersResult.rows.length;
    const score = answersResult.rows.filter((r) => r.is_correct).length;
    const passed = sittingPassed(score, totalItems);

    const result = await pool.query(
      `UPDATE exam_attempts 
       SET score = $1, total_items = $2, passed = $3, completed_at = now()
       WHERE id = $4
       RETURNING *`,
      [score, totalItems, passed, attemptId],
    );

    const attempt = result.rows[0];

    if (passed) {
      await pool.query(
        `INSERT INTO user_progress (user_id, exam_type, pass_count)
         VALUES ($1, $2, 1)
         ON CONFLICT (user_id, exam_type)
         DO UPDATE SET pass_count = user_progress.pass_count + 1, updated_at = now()`,
        [attempt.user_id, attempt.exam_type],
      );
    }

    // The passes are counted off the attempts themselves rather than the
    // running total, so a result screen can never disagree with the roster
    // that reads the same rows.
    const passesResult = await pool.query(
      `SELECT COUNT(*)::int AS passes
         FROM exam_attempts
        WHERE user_id = $1 AND exam_type = $2
          AND passed = true AND completed_at IS NOT NULL`,
      [attempt.user_id, attempt.exam_type],
    );

    const passes = cappedPasses(passesResult.rows[0]?.passes ?? 0);

    return NextResponse.json({
      ...attempt,
      passes,
      passes_required: PASSES_REQUIRED,
      track_passed: passes >= PASSES_REQUIRED,
    });
  } catch (error) {
    console.error("Error completing attempt:", error);
    return NextResponse.json(
      { error: "Failed to complete attempt" },
      { status: 500 },
    );
  }
}
