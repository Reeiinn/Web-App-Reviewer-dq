import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

const getVocabulary = unstable_cache(
  async (examType: string | null, query: string | null) => {
    const conditions: string[] = [];
    const values: string[] = [];

    if (examType) {
      values.push(examType);
      conditions.push(`exam_type = $${values.length}`);
    }

    if (query?.trim()) {
      values.push(`%${query.trim()}%`);
      // Examples and key points are searchable too, so "trust" finds the term
      // whose example mentions one even though its definition does not.
      conditions.push(
        `(term ILIKE $${values.length}
          OR definition ILIKE $${values.length}
          OR details::text ILIKE $${values.length})`,
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT id, exam_type, term, definition
       FROM vocabulary_terms
       ${where}
       ORDER BY term ASC`,
      values,
    );

    return result.rows;
  },
  ["vocabulary"],
  { tags: ["vocabulary"] },
);

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const examType = searchParams.get("exam_type");
  const query = searchParams.get("q")?.trim().toLowerCase() ?? null;

  try {
    const rows = await getVocabulary(examType, query);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching glossary terms:", error);

    return NextResponse.json(
      { error: "Failed to fetch glossary terms" },
      { status: 500 },
    );
  }
}
