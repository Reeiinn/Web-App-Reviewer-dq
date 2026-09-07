import pool from "@/lib/db";
import type { ExamType } from "@/lib/types/common";
import type { StudyMode } from "@/lib/types/study";

export type RecentActivityRow = {
  exam_type: ExamType;
  mode: StudyMode;
  visited_at: string;
};

/** Records that a learner just opened a study mode on a track, bumping it to the top of Quick Access. */
export async function recordVisit(
  userId: string,
  examType: ExamType,
  mode: StudyMode,
): Promise<void> {
  await pool.query(
    `INSERT INTO recent_activity (user_id, exam_type, mode, visited_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id, exam_type, mode) DO UPDATE SET
       visited_at = now()`,
    [userId, examType, mode],
  );
}

export async function fetchRecent(
  userId: string,
  limit: number,
): Promise<RecentActivityRow[]> {
  const result = await pool.query(
    `SELECT exam_type, mode, visited_at FROM recent_activity
     WHERE user_id = $1
     ORDER BY visited_at DESC
     LIMIT $2`,
    [userId, limit],
  );

  return result.rows.map((row) => ({
    exam_type: row.exam_type,
    mode: row.mode,
    visited_at: row.visited_at,
  }));
}
