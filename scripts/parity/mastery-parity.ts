// Compares the pre-Prisma mastery SQL with src/server/data/mastery.ts on the
// local dev copy. Exit code 1 on any difference. Run: pnpm parity
//
// The old queries are copied from the code as it stood before Wave 0
// (commit 5a16508), so this stays a fixed reference after the routes change.
import { config } from "dotenv";
import { Pool } from "pg";
import { assertLocalDatabase } from "../../src/server/db/local-guard";
import { examTypes } from "../../src/lib/types/common";

config({ path: ".env.local" });
const url = assertLocalDatabase(process.env.MIGRATE_DATABASE_URL);
process.env.DATABASE_URL = url;

const pool = new Pool({ connectionString: url });
const diffs: string[] = [];
const same = (label: string, a: unknown, b: unknown) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    diffs.push(`${label}\n  old: ${JSON.stringify(a)}\n  new: ${JSON.stringify(b)}`);
  }
};

// From api/progress: per-track totals, mastered counts, passes and last
// review for one user. Casts added so pg returns numbers.
const OLD_PROGRESS = `
  WITH flashcard_stats AS (
    SELECT f.exam_type, COUNT(f.id) AS total,
           COUNT(fp.id) FILTER (WHERE fp.mastered = true) AS mastered
    FROM flashcards f
    LEFT JOIN flashcard_progress fp ON fp.flashcard_id = f.id AND fp.user_id = $1
    GROUP BY f.exam_type),
  memorization_stats AS (
    SELECT m.exam_type, COUNT(m.id) AS total,
           COUNT(mp.id) FILTER (WHERE mp.mastered = true) AS mastered
    FROM memorization m
    LEFT JOIN memorization_progress mp ON mp.memorization_id = m.id AND mp.user_id = $1
    GROUP BY m.exam_type),
  question_stats AS (
    SELECT q.exam_type, COUNT(q.id) AS total,
           COUNT(qp.id) FILTER (WHERE qp.mastered = true) AS mastered
    FROM questions q
    LEFT JOIN question_progress qp ON qp.question_id = q.id AND qp.user_id = $1
    GROUP BY q.exam_type),
  exam_pass_stats AS (
    SELECT exam_type, COUNT(*) AS passes FROM exam_attempts
    WHERE user_id = $1 AND passed = true AND completed_at IS NOT NULL
    GROUP BY exam_type),
  activity_stats AS (
    SELECT exam_type, MAX(reviewed_at) AS last_activity_at FROM (
      SELECT f.exam_type, fp.reviewed_at FROM flashcard_progress fp
        JOIN flashcards f ON f.id = fp.flashcard_id WHERE fp.user_id = $1
      UNION ALL
      SELECT m.exam_type, mp.reviewed_at FROM memorization_progress mp
        JOIN memorization m ON m.id = mp.memorization_id WHERE mp.user_id = $1
      UNION ALL
      SELECT q.exam_type, qp.last_reviewed_at FROM question_progress qp
        JOIN questions q ON q.id = qp.question_id WHERE qp.user_id = $1
    ) reviews GROUP BY exam_type)
  SELECT COALESCE(f.exam_type, m.exam_type, q.exam_type)::text AS exam_type,
         a.last_activity_at,
         COALESCE(f.total, 0)::int AS flashcard_total, COALESCE(f.mastered, 0)::int AS flashcard_mastered,
         COALESCE(m.total, 0)::int AS memorize_total, COALESCE(m.mastered, 0)::int AS memorize_mastered,
         COALESCE(q.total, 0)::int AS practice_total, COALESCE(q.mastered, 0)::int AS practice_mastered,
         COALESCE(p.passes, 0)::int AS exam_passes
  FROM flashcard_stats f
  FULL OUTER JOIN memorization_stats m ON m.exam_type = f.exam_type
  FULL OUTER JOIN question_stats q ON q.exam_type = COALESCE(f.exam_type, m.exam_type)
  LEFT JOIN activity_stats a ON a.exam_type = COALESCE(f.exam_type, m.exam_type, q.exam_type)
  LEFT JOIN exam_pass_stats p ON p.exam_type = COALESCE(f.exam_type, m.exam_type, q.exam_type)`;

// From admin/reviewees: per (user, track) counts for many users.
const OLD_ROSTER = {
  flashcards: `SELECT fp.user_id::text, f.exam_type::text, COUNT(*) FILTER (WHERE fp.mastered)::int AS mastered
                 FROM flashcard_progress fp JOIN flashcards f ON f.id = fp.flashcard_id
                WHERE fp.user_id = ANY($1) GROUP BY fp.user_id, f.exam_type`,
  memorization: `SELECT mp.user_id::text, m.exam_type::text,
                        COUNT(*) FILTER (WHERE mp.mastered)::int AS mastered,
                        COUNT(*)::int AS answered,
                        COUNT(*) FILTER (WHERE mp.is_correct)::int AS correct
                   FROM memorization_progress mp JOIN memorization m ON m.id = mp.memorization_id
                  WHERE mp.user_id = ANY($1) GROUP BY mp.user_id, m.exam_type`,
  questions: `SELECT qp.user_id::text, q.exam_type::text, COUNT(*) FILTER (WHERE qp.mastered)::int AS mastered
                FROM question_progress qp JOIN questions q ON q.id = qp.question_id
               WHERE qp.user_id = ANY($1) GROUP BY qp.user_id, q.exam_type`,
  attempts: `SELECT user_id::text, exam_type::text, COUNT(*)::int AS taken,
                    COUNT(*) FILTER (WHERE passed)::int AS passed
               FROM exam_attempts WHERE user_id = ANY($1) AND completed_at IS NOT NULL
              GROUP BY user_id, exam_type`,
  streaks: `SELECT user_id::text, exam_type::text, last_answer_at
              FROM study_streaks WHERE user_id = ANY($1)`,
};

type Row = Record<string, unknown>;

async function main() {
  const { getTrackCounts, getTrackCountsFor } = await import(
    "../../src/server/data/mastery"
  );
  const { eligibleTracks } = await import("../../src/lib/helper/track-counts");
  const order = examTypes as readonly string[];

  const users = (await pool.query(`SELECT id::text FROM users`)).rows.map(
    (r) => r.id as string,
  );
  console.log(`Comparing ${users.length} users…`);

  for (const userId of users) {
    const old = (await pool.query(OLD_PROGRESS, [userId])).rows
      .filter((r) => order.includes(r.exam_type))
      .sort((a, b) => order.indexOf(a.exam_type) - order.indexOf(b.exam_type));
    const next = await getTrackCounts(userId);

    same(
      `progress tracks ${userId}`,
      old.map((r) => r.exam_type),
      next.map((t) => t.examType),
    );
    for (const t of next) {
      const r = old.find((o) => o.exam_type === t.examType);
      same(
        `progress ${userId} ${t.examType}`,
        {
          f: [r?.flashcard_mastered, r?.flashcard_total],
          m: [r?.memorize_mastered, r?.memorize_total],
          q: [r?.practice_mastered, r?.practice_total],
          passes: r?.exam_passes,
          last: r?.last_activity_at ? new Date(r.last_activity_at).toISOString() : null,
        },
        {
          f: [t.flashcards.mastered, t.flashcards.total],
          m: [t.memorization.mastered, t.memorization.total],
          q: [t.practice.mastered, t.practice.total],
          passes: t.passingAttempts,
          last: t.lastReviewedAt ? t.lastReviewedAt.toISOString() : null,
        },
      );
    }

    // Old eligibility listed tracks present in flashcards or memorization.
    same(
      `eligibility tracks ${userId}`,
      old
        .filter((r) => r.flashcard_total > 0 || r.memorize_total > 0)
        .map((r) => r.exam_type),
      eligibleTracks(next).map((t) => t.examType),
    );
  }

  const rosterNew = await getTrackCountsFor(users, examTypes);
  const rosterOld = Object.fromEntries(
    await Promise.all(
      Object.entries(OLD_ROSTER).map(async ([k, sql]) => [
        k,
        (await pool.query(sql, [users])).rows,
      ]),
    ),
  ) as Record<keyof typeof OLD_ROSTER, Row[]>;
  const pick = (rows: Row[], u: string, t: string) =>
    rows.find((r) => r.user_id === u && r.exam_type === t);

  for (const userId of users) {
    for (const t of rosterNew.get(userId)!) {
      const m = pick(rosterOld.memorization, userId, t.examType);
      const a = pick(rosterOld.attempts, userId, t.examType);
      const s = pick(rosterOld.streaks, userId, t.examType);
      same(
        `roster ${userId} ${t.examType}`,
        {
          f: pick(rosterOld.flashcards, userId, t.examType)?.mastered ?? 0,
          m: m?.mastered ?? 0,
          answered: m?.answered ?? 0,
          correct: m?.correct ?? 0,
          q: pick(rosterOld.questions, userId, t.examType)?.mastered ?? 0,
          taken: a?.taken ?? 0,
          passed: a?.passed ?? 0,
          last: (s?.last_answer_at as Date | null | undefined)?.toISOString() ?? null,
        },
        {
          f: t.flashcards.mastered,
          m: t.memorization.mastered,
          answered: t.memorizationAnswered,
          correct: t.memorizationCorrect,
          q: t.practice.mastered,
          taken: t.attemptsTaken,
          passed: t.passingAttempts,
          last: t.lastAnswerAt?.toISOString() ?? null,
        },
      );
    }
  }

  console.log(diffs.length === 0 ? "parity: 0 differences" : diffs.join("\n"));
  if (diffs.length) process.exitCode = 1;
  console.log(
    "Intended differences, not compared: GET /api/user (deleted in Wave 1); roster activity.lastActivity (now the latest instant).",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    const { default: prisma } = await import("../../src/server/db/prisma");
    await prisma.$disconnect();
  });
