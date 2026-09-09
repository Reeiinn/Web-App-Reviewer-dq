import { auth } from "@/lib/auth";
import pool from "@/lib/db";
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
    const attemptResult = await pool.query(
      `SELECT * FROM exam_attempts WHERE id = $1`,
      [id],
    );

    if (attemptResult.rows.length === 0) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const attempt = attemptResult.rows[0];

    // ownership / access check
    if (role === "ADMIN") {
      // no restriction
    } else if (role === "MANAGER") {
      const check = await pool.query(
        `SELECT 1 FROM users
          WHERE id = $1 AND manager_id = $2 AND deleted_at IS NULL`,
        [attempt.user_id, currentUserId],
      );
      const isOwnAttempt = attempt.user_id === currentUserId;
      if (check.rowCount === 0 && !isOwnAttempt) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (attempt.user_id !== currentUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const answersResult = await pool.query(
      `SELECT 
         a.id, a.question_id, a.selected_choice_id, a.is_correct,
         q.text AS question_text
       FROM exam_attempt_answers a
       JOIN questions q ON q.id = a.question_id
       WHERE a.attempt_id = $1`,
      [id],
    );

    return NextResponse.json({
      ...attempt,
      answers: answersResult.rows,
    });
  } catch (error) {
    console.error("Error fetching attempt:", error);
    return NextResponse.json(
      { error: "Failed to fetch attempt" },
      { status: 500 },
    );
  }
}
