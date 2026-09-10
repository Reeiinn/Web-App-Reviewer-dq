import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import redis from "@/lib/redis";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const examType = searchParams.get("exam_type");
  const query = searchParams.get("q");

  const cacheKey = `vocabulary:${examType ?? "all"}:${query?.trim().toLowerCase() ?? "all"}`;

  try {
    // Check Redis first
    if (redis) {
      const cached = await redis.get(cacheKey);

      if (cached) {
        console.log("🟢 CACHE HIT:", cacheKey);
        return NextResponse.json(cached);
      }

      console.log("🔴 CACHE MISS:", cacheKey);
    }

    // Query PostgreSQL
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

    // Save result to Redis
    if (redis) {
      await redis.set(cacheKey, result.rows, {
        ex: 60 * 5,
      });

      console.log("💾 SAVED TO CACHE:", cacheKey);
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching glossary terms:", error);

    return NextResponse.json(
      { error: "Failed to fetch glossary terms" },
      { status: 500 },
    );
  }
}
