import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { lockReason } from "@/lib/helper/eligibility";
import { fetchEligibility } from "@/app/api/_lib/mastery";
import { NextResponse } from "next/server";

/** One sitting's question ids, in the order the learner will see them. */
async function dealQuestions(examType: string): Promise<string[]> {
  const result = await pool.query(
    `SELECT id FROM questions WHERE exam_type = $1 ORDER BY random()`,
    [examType],
  );
  return result.rows.map((row) => row.id as string);
}

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

    // Reopening the exam picks the unfinished sitting back up rather than
    // starting a second one. Every page load used to insert a row, so a
    // refresh abandoned the answers already saved against the old attempt and
    // left an empty row behind it.
    const open = await pool.query(
      `SELECT * FROM exam_attempts
        WHERE user_id = $1 AND exam_type = $2 AND completed_at IS NULL
        ORDER BY started_at DESC
        LIMIT 1`,
      [session.user.id, exam_type],
    );

    if (open.rows[0]) {
      const attempt = open.rows[0];

      // Sittings that predate the stored order get one now, so every resume
      // from here on returns the same paper.
      if (!attempt.question_order) {
        const filled = await pool.query(
          `UPDATE exam_attempts SET question_order = $2 WHERE id = $1
           RETURNING *`,
          [attempt.id, JSON.stringify(await dealQuestions(exam_type))],
        );
        return NextResponse.json(filled.rows[0]);
      }

      return NextResponse.json(attempt);
    }

    // The paper is dealt once, here, and kept with the attempt. Shuffling on
    // the page instead meant every reload reordered questions the learner had
    // already answered.
    const result = await pool.query(
      `INSERT INTO exam_attempts
         (user_id, exam_type, score, total_items, passed, question_order)
       VALUES ($1, $2, 0, 0, false, $3)
       RETURNING *`,
      [
        session.user.id,
        exam_type,
        JSON.stringify(await dealQuestions(exam_type)),
      ],
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error starting attempt:", error);
    return NextResponse.json(
      { error: "Failed to start attempt" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const examType = searchParams.get("exam_type");

  try {
    let query = `SELECT * FROM exam_attempts WHERE user_id = $1`;
    const values: string[] = [session.user.id];

    if (examType) {
      values.push(examType);
      query += ` AND exam_type = $${values.length}`;
    }

    query += ` ORDER BY started_at DESC`;

    const result = await pool.query(query, values);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching attempts:", error);
    return NextResponse.json(
      { error: "Failed to fetch attempts" },
      { status: 500 },
    );
  }
}
