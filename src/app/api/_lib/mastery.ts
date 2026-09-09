import pool from "@/lib/db";
import { deriveEligibility } from "@/lib/helper/eligibility";
import type { Eligibility } from "@/lib/types/eligibility";

/**
 * Mastery counts for one user on every track at once.
 *
 * The dashboard shows four tracks and used to ask about them one at a time:
 * four requests, each running two counting queries, for one screen. The counts
 * group by exam_type in the database instead, which is two queries whatever the
 * app grows to.
 *
 * A track with no material of one kind still answers — zero of zero, which
 * deriveEligibility already refuses to call a qualification.
 */
export async function fetchAllEligibility(
  userId: string,
): Promise<Record<string, Eligibility>> {
  const [flashcards, memorization] = await Promise.all([
    pool.query(
      `SELECT f.exam_type,
              COUNT(f.id) AS total,
              COUNT(fp.id) FILTER (WHERE fp.mastered = true) AS mastered
       FROM flashcards f
       LEFT JOIN flashcard_progress fp
         ON fp.flashcard_id = f.id AND fp.user_id = $1
       GROUP BY f.exam_type`,
      [userId],
    ),
    pool.query(
      `SELECT m.exam_type,
              COUNT(m.id) AS total,
              COUNT(mp.id) FILTER (WHERE mp.mastered = true) AS mastered
       FROM memorization m
       LEFT JOIN memorization_progress mp
         ON mp.memorization_id = m.id AND mp.user_id = $1
       GROUP BY m.exam_type`,
      [userId],
    ),
  ]);

  const counts = (
    rows: { exam_type: string; total: string; mastered: string }[],
  ) =>
    new Map(
      rows.map((row) => [
        row.exam_type,
        { mastered: Number(row.mastered), total: Number(row.total) },
      ]),
    );

  const byTrack = {
    flashcards: counts(flashcards.rows),
    memorization: counts(memorization.rows),
  };

  const empty = { mastered: 0, total: 0 };
  const tracks = new Set([
    ...byTrack.flashcards.keys(),
    ...byTrack.memorization.keys(),
  ]);

  return Object.fromEntries(
    [...tracks].map((examType) => [
      examType,
      deriveEligibility(
        byTrack.flashcards.get(examType) ?? empty,
        byTrack.memorization.get(examType) ?? empty,
      ),
    ]),
  );
}

/**
 * The same counts for one named track, for the practice-exam gate, which only
 * ever asks about the track someone is trying to sit.
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
