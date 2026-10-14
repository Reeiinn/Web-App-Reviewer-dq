import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { Memorization } from "@/lib/types/memo";
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
    let query = `
      SELECT 
        m.id,
        m.exam_type,
        m.category,
        m.text,
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
      FROM memorization m
      LEFT JOIN memorization_choices c ON c.memorization_id = m.id
      WHERE m.id = $1
      GROUP BY m.id
    `;
    const result = await pool.query<Memorization>(query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Memorization not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching memorization:", error);
    return NextResponse.json(
      { error: "Failed to fetch memorization" },
      { status: 500 },
    );
  }
}
