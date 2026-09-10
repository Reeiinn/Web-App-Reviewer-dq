import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import redis from "@/lib/redis";
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

  // Include filters in the cache key
  const cacheKey = `flashcards:${examType ?? "all"}:${category ?? "all"}`;

  try {
    // 1. Check Redis
    if (redis) {
      const cached = await redis.get<Flashcard[]>(cacheKey);

      if (cached) {
        console.log("🟢 REDIS CACHE HIT:", cacheKey);
        return NextResponse.json(cached);
      }

      console.log("🔴 REDIS CACHE MISS:", cacheKey);
    }

    // 2. Cache miss → query PostgreSQL
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
              ORDER BY c.id
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

    // 3. Save result to Redis
    if (redis) {
      await redis.set(cacheKey, result.rows, {
        ex: 60 * 5, // 5 minutes
      });
    }

    // 4. Return result
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching flashcards:", error);

    return NextResponse.json(
      { error: "Failed to fetch flashcards" },
      { status: 500 },
    );
  }
}
