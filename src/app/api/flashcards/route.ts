import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { Flashcard } from "@/lib/types/flashcard";
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
    // A card's options come from the exam question it was drawn from. The two
    // tables share no key, so the question is found by its text — which is
    // enough on its own for all but a handful of texts that are reused across
    // questions with different options (three IIAP questions read "Which of
    // the following statements is correct?"). Matching those on text alone
    // would pool every one of their choices onto the same card, so where the
    // text is ambiguous the card's own back — the correct option — picks out
    // the question that was meant.
    //
    // The back cannot be the only test: on ten cards the correct choice is
    // "all of the above", and the flashcard spells the answer out instead of
    // repeating a phrase that means nothing on its own, so no back matches.
    // Those texts are unique, so the count check resolves them and the back
    // is consulted only where it is actually needed. LIMIT 1 keeps a card
    // that satisfies neither from multiplying the rows.
    let query = `
      SELECT
        f.id,
        f.exam_type,
        f.category,
        f.front,
        f.back,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object('id', c.id, 'text', c.text)
              -- c.id is a random uuid, so ordering on it dealt the options in
              -- a different order per card. sort_order is the exam's own.
              ORDER BY c.sort_order
            )
            FROM choices c
            WHERE c.question_id = q.id
          ), '[]'
        ) AS choices
      FROM flashcards f
      LEFT JOIN LATERAL (
        SELECT q.id
        FROM questions q
        WHERE q.exam_type = f.exam_type
          AND q.text = f.front
          AND (
            (
              SELECT count(*)
              FROM questions dup
              WHERE dup.exam_type = f.exam_type
                AND dup.text = f.front
            ) = 1
            OR EXISTS (
              SELECT 1
              FROM choices c
              WHERE c.question_id = q.id
                AND c.is_correct
                AND c.text = f.back
            )
          )
        LIMIT 1
      ) q ON true
    `;

    const conditions: string[] = [];
    const values: string[] = [];

    if (examType) {
      values.push(examType);
      conditions.push(`f.exam_type = $${values.length}`);
    }

    if (category) {
      values.push(category);
      conditions.push(`f.category = $${values.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY f.category ASC`;

    const result = await pool.query<Flashcard>(query, values);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching flashcards:", error);
    return NextResponse.json(
      { error: "Failed to fetch flashcards" },
      { status: 500 },
    );
  }
}
