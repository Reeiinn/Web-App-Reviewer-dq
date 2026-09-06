import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { readinessStatus } from "@/lib/helper/readiness";
import { NextResponse } from "next/server";

type Counts = { total: number; mastered: number };

const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

/**
 * Roster for the admin console. ADMIN sees everyone; MANAGER sees only their
 * own reports. Every column here is backed by a real table — the mockup's
 * cohort badges and scheduled exam dates have no data behind them and are
 * deliberately absent.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, id: currentUserId } = session.user;

  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // manager_id is set at signup from the invite the reviewee used, so it is
    // the recruiter. An admin sees every reviewee and who recruited them; a
    // manager sees only the reviewees they recruited themselves.
    const selectReviewees = `
      SELECT u.id, u.email, u.name, u.role,
             m.id    AS manager_id,
             m.name  AS manager_name,
             m.email AS manager_email,
             m.role  AS manager_role
        FROM users u
        LEFT JOIN users m ON m.id = u.manager_id
       WHERE u.role = 'USER'
    `;

    const usersResult =
      role === "ADMIN"
        ? await pool.query(`${selectReviewees} ORDER BY u.name ASC`)
        : await pool.query(
            `${selectReviewees} AND u.manager_id = $1 ORDER BY u.name ASC`,
            [currentUserId],
          );

    const users = usersResult.rows;
    if (users.length === 0) return NextResponse.json([]);

    const userIds = users.map((user) => user.id);

    // Totals are per-track content counts, independent of any user.
    const [
      contentTotals,
      flashcards,
      memorization,
      questions,
      attempts,
      streaks,
    ] = await Promise.all([
      pool.query(
        `SELECT
             (SELECT COUNT(*) FROM flashcards)    AS flashcards,
             (SELECT COUNT(*) FROM memorization)  AS memorization,
             (SELECT COUNT(*) FROM questions)     AS questions`,
      ),
      pool.query(
        `SELECT user_id, COUNT(*) FILTER (WHERE mastered) AS mastered
           FROM flashcard_progress WHERE user_id = ANY($1) GROUP BY user_id`,
        [userIds],
      ),
      pool.query(
        `SELECT user_id,
                  COUNT(*) FILTER (WHERE mastered)   AS mastered,
                  COUNT(*)                           AS answered,
                  COUNT(*) FILTER (WHERE is_correct) AS correct
           FROM memorization_progress WHERE user_id = ANY($1) GROUP BY user_id`,
        [userIds],
      ),
      pool.query(
        `SELECT user_id, COUNT(*) FILTER (WHERE mastered) AS mastered
           FROM question_progress WHERE user_id = ANY($1) GROUP BY user_id`,
        [userIds],
      ),
      pool.query(
        `SELECT user_id,
                  COUNT(*)                       AS taken,
                  COUNT(*) FILTER (WHERE passed) AS passed,
                  AVG(CASE WHEN total_items > 0
                           THEN score::numeric / total_items * 100 END) AS average
           FROM exam_attempts
           WHERE user_id = ANY($1) AND completed_at IS NOT NULL
           GROUP BY user_id`,
        [userIds],
      ),
      pool.query(
        `SELECT user_id,
                  MAX(current_streak) AS current_streak,
                  MAX(best_streak)    AS best_streak,
                  MAX(last_answer_at) AS last_answer_at
           FROM study_streaks WHERE user_id = ANY($1) GROUP BY user_id`,
        [userIds],
      ),
    ]);

    const totals = contentTotals.rows[0];
    const index = <T extends { user_id: string }>(rows: T[]) =>
      new Map(rows.map((row) => [row.user_id, row]));

    const flashcardsBy = index(flashcards.rows);
    const memorizationBy = index(memorization.rows);
    const questionsBy = index(questions.rows);
    const attemptsBy = index(attempts.rows);
    const streaksBy = index(streaks.rows);

    const roster = users.map((user) => {
      const flashcardCounts: Counts = {
        total: Number(totals.flashcards),
        mastered: Number(flashcardsBy.get(user.id)?.mastered ?? 0),
      };
      const memorizationRow = memorizationBy.get(user.id);
      const memorizationCounts: Counts = {
        total: Number(totals.memorization),
        mastered: Number(memorizationRow?.mastered ?? 0),
      };
      const practiceCounts: Counts = {
        total: Number(totals.questions),
        mastered: Number(questionsBy.get(user.id)?.mastered ?? 0),
      };

      const readiness = Math.round(
        (pct(flashcardCounts.mastered, flashcardCounts.total) +
          pct(memorizationCounts.mastered, memorizationCounts.total) +
          pct(practiceCounts.mastered, practiceCounts.total)) /
          3,
      );

      const attemptRow = attemptsBy.get(user.id);
      const streakRow = streaksBy.get(user.id);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        // Null when the account predates invite-only signup.
        manager: user.manager_id
          ? {
              id: user.manager_id,
              name: user.manager_name,
              email: user.manager_email,
              role: user.manager_role as "ADMIN" | "MANAGER",
            }
          : null,
        readiness,
        status: readinessStatus(readiness),
        flashcards: flashcardCounts,
        memorize: {
          ...memorizationCounts,
          accuracy: pct(
            Number(memorizationRow?.correct ?? 0),
            Number(memorizationRow?.answered ?? 0),
          ),
        },
        practice: practiceCounts,
        mockExam: {
          taken: Number(attemptRow?.taken ?? 0),
          passed: Number(attemptRow?.passed ?? 0),
          average: attemptRow?.average
            ? Math.round(Number(attemptRow.average) * 10) / 10
            : null,
        },
        streak: {
          current: Number(streakRow?.current_streak ?? 0),
          best: Number(streakRow?.best_streak ?? 0),
          lastActivity: streakRow?.last_answer_at ?? null,
        },
      };
    });

    return NextResponse.json(roster);
  } catch (error) {
    console.error("Error fetching reviewee roster:", error);
    return NextResponse.json(
      { error: "Failed to fetch roster" },
      { status: 500 },
    );
  }
}
