import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { MemorizationQuestion } from "@/lib/types/memo";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const examType = searchParams.get("exam_type");
  const category = searchParams.get("category");

  try {
    // The learner's own last answer rides along with the item, so a resumed
    // sitting can show a question they already answered exactly as they left
    // it rather than blank and answerable a second time.
    let query = `
      SELECT
        m.id,
        m.exam_type,
        m.category,
        m.text,
        mp.selected_choice_id AS answered_choice_id,
        COALESCE(
          json_agg(
            json_build_object(
              'id', c.id,
              'text', c.text,
              'is_correct', c.is_correct
            )
          ) FILTER (WHERE c.id IS NOT NULL), '[]'
        ) AS choices
      FROM memorization m
      LEFT JOIN memorization_choices c ON c.memorization_id = m.id
      LEFT JOIN memorization_progress mp
        ON mp.memorization_id = m.id AND mp.user_id = $1
    `;

    const conditions: string[] = [];
    const values: string[] = [session.user.id];

    if (examType) {
      values.push(examType);
      conditions.push(`m.exam_type = $${values.length}`);
    }
    if (category) {
      values.push(category);
      conditions.push(`m.category = $${values.length}`);
    }
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` GROUP BY m.id, mp.selected_choice_id ORDER BY m.text ASC`;

    const result = await pool.query<MemorizationQuestion>(query, values);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching memorization:", error);
    return NextResponse.json(
      { error: "Failed to fetch memorization" },
      { status: 500 },
    );
  }
}
