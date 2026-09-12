import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import type { Question } from "@/lib/types/questions";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const examType = searchParams.get("exam_type");
  const category = searchParams.get("category");

  try {
    let query = `
      SELECT 
        q.id,
        q.exam_type,
        q.category,
        q.text,
        q.explanation,
        q.difficulty,
        q.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', c.id,
              'text', c.text,
              'is_correct', c.is_correct
            )
            -- The order the source exam prints the options in. Without it the
            -- options come back in whatever order the planner produced, so the
            -- A/B/C/D the exam page stamps on them moved between page loads.
            ORDER BY c.sort_order
          ) FILTER (WHERE c.id IS NOT NULL), '[]'
        ) AS choices
      FROM questions q
      LEFT JOIN choices c ON c.question_id = q.id
    `;

    const conditions: string[] = [];
    const values: string[] = [];

    if (examType) {
      values.push(examType);
      conditions.push(`q.exam_type = $${values.length}`);
    }
    if (category) {
      values.push(category);
      conditions.push(`q.category = $${values.length}`);
    }
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` GROUP BY q.id ORDER BY q.created_at DESC`;

    const result = await pool.query<Question>(query, values);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 },
    );
  }
}
