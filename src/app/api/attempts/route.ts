import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { lockReason } from "@/lib/helper/eligibility";
import { fetchEligibility } from "@/app/api/_lib/mastery";
import { NextResponse } from "next/server";

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
      return NextResponse.json(open.rows[0]);
    }

    const result = await pool.query(
      `INSERT INTO exam_attempts (user_id, exam_type, score, total_items, passed)
       VALUES ($1, $2, 0, 0, false)
       RETURNING *`,
      [session.user.id, exam_type],
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
