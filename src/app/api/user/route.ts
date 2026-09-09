import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, id: currentUserId } = session.user;

  if (role === "USER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 1. Figure out which users this caller is allowed to see
    const usersResult =
      role === "ADMIN"
        ? await pool.query(
            `SELECT id, email, name, role, manager_id FROM users
              WHERE deleted_at IS NULL ORDER BY created_at DESC`,
          )
        : await pool.query(
            `SELECT id, email, name, role, manager_id FROM users
              WHERE manager_id = $1 AND deleted_at IS NULL
              ORDER BY created_at DESC`,
            [currentUserId],
          );

    const users = usersResult.rows;
    if (users.length === 0) {
      return NextResponse.json([]);
    }

    const userIds = users.map((u) => u.id);

    // 2. Pull progress for ALL those users in one shot (no N+1)
    const progressQuery = `
      WITH flashcard_stats AS (
        SELECT 
          fp.user_id,
          f.exam_type,
          COUNT(f.id) AS total,
          COUNT(fp.id) FILTER (WHERE fp.mastered = true) AS mastered
        FROM flashcards f
        LEFT JOIN flashcard_progress fp 
          ON fp.flashcard_id = f.id AND fp.user_id = ANY($1)
        GROUP BY fp.user_id, f.exam_type
      ),
      memorization_stats AS (
        SELECT 
          mp.user_id,
          m.exam_type,
          COUNT(m.id) AS total,
          COUNT(mp.id) FILTER (WHERE mp.mastered = true) AS mastered
        FROM memorization m
        LEFT JOIN memorization_progress mp 
          ON mp.memorization_id = m.id AND mp.user_id = ANY($1)
        GROUP BY mp.user_id, m.exam_type
      ),
      question_stats AS (
        SELECT 
          qp.user_id,
          q.exam_type,
          COUNT(q.id) AS total,
          COUNT(qp.id) FILTER (WHERE qp.mastered = true) AS mastered
        FROM questions q
        LEFT JOIN question_progress qp 
          ON qp.question_id = q.id AND qp.user_id = ANY($1)
        GROUP BY qp.user_id, q.exam_type
      )
      SELECT 
        COALESCE(f.user_id, m.user_id, q.user_id) AS user_id,
        COALESCE(f.exam_type, m.exam_type, q.exam_type) AS exam_type,
        COALESCE(f.total, 0) AS flashcard_total,
        COALESCE(f.mastered, 0) AS flashcard_mastered,
        COALESCE(m.total, 0) AS memorize_total,
        COALESCE(m.mastered, 0) AS memorize_mastered,
        COALESCE(q.total, 0) AS practice_total,
        COALESCE(q.mastered, 0) AS practice_mastered
      FROM flashcard_stats f
      FULL OUTER JOIN memorization_stats m 
        ON m.exam_type = f.exam_type AND m.user_id = f.user_id
      FULL OUTER JOIN question_stats q 
        ON q.exam_type = COALESCE(f.exam_type, m.exam_type) 
        AND q.user_id = COALESCE(f.user_id, m.user_id)
      WHERE COALESCE(f.user_id, m.user_id, q.user_id) IS NOT NULL
    `;

    const progressResult = await pool.query(progressQuery, [userIds]);

    // 3. Group progress rows by user_id
    const progressByUser = new Map<string, any[]>();
    for (const row of progressResult.rows) {
      const flashcardPct =
        row.flashcard_total > 0
          ? (row.flashcard_mastered / row.flashcard_total) * 100
          : 0;
      const memorizePct =
        row.memorize_total > 0
          ? (row.memorize_mastered / row.memorize_total) * 100
          : 0;
      const practicePct =
        row.practice_total > 0
          ? (row.practice_mastered / row.practice_total) * 100
          : 0;
      const overallPct = (flashcardPct + memorizePct + practicePct) / 3;

      const entry = {
        exam_type: row.exam_type,
        flashcard_pct: Math.round(flashcardPct),
        memorize_pct: Math.round(memorizePct),
        practice_exam_pct: Math.round(practicePct),
        overall_pct: Math.round(overallPct),
      };

      if (!progressByUser.has(row.user_id)) {
        progressByUser.set(row.user_id, []);
      }
      progressByUser.get(row.user_id)!.push(entry);
    }

    // 4. Merge users + their progress
    const response = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      manager_id: u.manager_id,
      progress: progressByUser.get(u.id) ?? [],
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching governed progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 },
    );
  }
}
