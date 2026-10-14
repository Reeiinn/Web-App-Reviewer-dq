import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import type { Question } from "@/lib/types/questions";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const query = `
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
            ORDER BY c.sort_order
          ) FILTER (WHERE c.id IS NOT NULL), '[]'
        ) AS choices
      FROM questions q
      LEFT JOIN choices c ON c.question_id = q.id
      WHERE q.id = $1
      GROUP BY q.id
    `;

    const result = await pool.query<Question>(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching question:", error);
    return NextResponse.json(
      { error: "Failed to fetch question" },
      { status: 500 },
    );
  }
}
