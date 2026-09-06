import pool from "@/lib/db";
import { deriveEligibility } from "@/lib/helper/eligibility";
import type { Eligibility } from "@/lib/types/eligibility";

/**
 * Mastery counts for one user on one track, used by both the eligibility check
 * and the practice-exam gate so the two can never disagree.
 */
export async function fetchEligibility(
  userId: string,
  examType: string,
): Promise<Eligibility> {
  const [flashcards, memorization] = await Promise.all([
    pool.query(
      `SELECT COUNT(f.id) AS total,
              COUNT(fp.id) FILTER (WHERE fp.mastered = true) AS mastered
       FROM flashcards f
       LEFT JOIN flashcard_progress fp
         ON fp.flashcard_id = f.id AND fp.user_id = $1
       WHERE f.exam_type = $2`,
      [userId, examType],
    ),
    pool.query(
      `SELECT COUNT(m.id) AS total,
              COUNT(mp.id) FILTER (WHERE mp.mastered = true) AS mastered
       FROM memorization m
       LEFT JOIN memorization_progress mp
         ON mp.memorization_id = m.id AND mp.user_id = $1
       WHERE m.exam_type = $2`,
      [userId, examType],
    ),
  ]);

  return deriveEligibility(
    {
      mastered: Number(flashcards.rows[0].mastered),
      total: Number(flashcards.rows[0].total),
    },
    {
      mastered: Number(memorization.rows[0].mastered),
      total: Number(memorization.rows[0].total),
    },
  );
}
