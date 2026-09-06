import pool from "@/lib/db";
import { nextStreak, streakMilestone } from "@/lib/helper/streaks";
import type { StreakResult, StreakRow } from "@/lib/types/streak";

/**
 * Applies one answer to the user's streak for a track and persists the result.
 *
 * The read and the write run in a single statement so two answers submitted at
 * once cannot both read the same starting value and lose an increment.
 */
export async function applyStreak(
  userId: string,
  examType: string,
  isCorrect: boolean,
): Promise<StreakResult> {
  const existing = await pool.query(
    `SELECT current_streak, best_streak FROM study_streaks
     WHERE user_id = $1 AND exam_type = $2`,
    [userId, examType],
  );

  const previous = existing.rows[0]
    ? {
        current: Number(existing.rows[0].current_streak),
        best: Number(existing.rows[0].best_streak),
      }
    : { current: 0, best: 0 };

  const update = nextStreak(previous, isCorrect);

  const saved = await pool.query(
    `INSERT INTO study_streaks
       (user_id, exam_type, current_streak, best_streak, last_answer_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (user_id, exam_type) DO UPDATE SET
       current_streak = CASE
         WHEN $5 THEN study_streaks.current_streak + 1
         ELSE 0
       END,
       best_streak = GREATEST(
         study_streaks.best_streak,
         CASE WHEN $5 THEN study_streaks.current_streak + 1 ELSE 0 END
       ),
       last_answer_at = now()
     RETURNING current_streak, best_streak`,
    [userId, examType, update.current, update.best, isCorrect],
  );

  const current = Number(saved.rows[0].current_streak);
  const best = Number(saved.rows[0].best_streak);

  return {
    current,
    best,
    isNewBest: current === best && current > previous.best,
    milestone: streakMilestone(current),
  };
}

export async function fetchStreaks(userId: string): Promise<StreakRow[]> {
  const result = await pool.query(
    `SELECT exam_type, current_streak, best_streak, last_answer_at
     FROM study_streaks WHERE user_id = $1`,
    [userId],
  );

  return result.rows.map((row) => ({
    exam_type: row.exam_type,
    current_streak: Number(row.current_streak),
    best_streak: Number(row.best_streak),
    last_answer_at: row.last_answer_at,
  }));
}
