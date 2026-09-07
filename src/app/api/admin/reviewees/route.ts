import { auth } from "@/lib/auth";
import { touchLastSeen } from "@/app/api/_lib/presence-store";
import pool from "@/lib/db";
import { readinessStatus } from "@/lib/helper/readiness";
import { examTypes, type ExamType } from "@/lib/types/common";
import {
  PASSES_REQUIRED,
  cappedPasses,
  hasPassedTrack,
} from "@/lib/helper/practice-exam";
import { NextResponse } from "next/server";

type Counts = { total: number; mastered: number };

const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

/** Rows keyed by user and track, as (user_id, exam_type) pairs. */
type TrackRow = { user_id: string; exam_type: ExamType };

const trackKey = (userId: string, examType: string) => `${userId} ${examType}`;

const indexByTrack = <T extends TrackRow>(rows: T[]) =>
  new Map(rows.map((row) => [trackKey(row.user_id, row.exam_type), row]));

/**
 * Roster for the admin console. ADMIN sees everyone; MANAGER sees only their
 * own reports. Every column here is backed by a real table — the mockup's
 * cohort badges and scheduled exam dates have no data behind them and are
 * deliberately absent.
 *
 * Accepts ?exam_type=<track> to scope every number to one track. Without it,
 * readiness is the mean of the per-track readiness scores, so a track counts
 * the same whether it holds 20 items or 200 — seeding a new track then moves
 * the score by a known fraction rather than by however large the seed was.
 * The count columns still show totals summed across tracks.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, id: currentUserId } = session.user;

  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Loading the roster is what opening /admin does, so this is the stamp
  // that says the account opened the app at all.
  await touchLastSeen(currentUserId);

  const requested = new URL(req.url).searchParams.get("exam_type");
  const selected = examTypes.includes(requested as ExamType)
    ? (requested as ExamType)
    : null;
  const tracks = selected ? [selected] : examTypes;

  try {
    // manager_id is set at signup from the invite the reviewee used, so it is
    // the recruiter. An admin sees every reviewee and who recruited them; a
    // manager sees only the reviewees they recruited themselves.
    const selectReviewees = `
      SELECT u.id, u.email, u.name, u.role, u.image,
             m.id    AS manager_id,
             m.name  AS manager_name,
             m.email AS manager_email,
             m.role  AS manager_role,
             m.image AS manager_image
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

    // Progress tables reference content by id and carry no exam_type of their
    // own, so each one joins its content table to learn which track it is in.
    const [
      contentTotals,
      flashcards,
      memorization,
      questions,
      attempts,
      streaks,
    ] = await Promise.all([
      pool.query(
        `SELECT exam_type, 'flashcards' AS kind, COUNT(*) AS total
           FROM flashcards GROUP BY exam_type
         UNION ALL
         SELECT exam_type, 'memorization', COUNT(*)
           FROM memorization GROUP BY exam_type
         UNION ALL
         SELECT exam_type, 'questions', COUNT(*)
           FROM questions GROUP BY exam_type`,
      ),
      pool.query(
        `SELECT fp.user_id, f.exam_type,
                COUNT(*) FILTER (WHERE fp.mastered) AS mastered
           FROM flashcard_progress fp
           JOIN flashcards f ON f.id = fp.flashcard_id
          WHERE fp.user_id = ANY($1)
          GROUP BY fp.user_id, f.exam_type`,
        [userIds],
      ),
      pool.query(
        `SELECT mp.user_id, m.exam_type,
                COUNT(*) FILTER (WHERE mp.mastered)   AS mastered,
                COUNT(*)                              AS answered,
                COUNT(*) FILTER (WHERE mp.is_correct) AS correct
           FROM memorization_progress mp
           JOIN memorization m ON m.id = mp.memorization_id
          WHERE mp.user_id = ANY($1)
          GROUP BY mp.user_id, m.exam_type`,
        [userIds],
      ),
      pool.query(
        `SELECT qp.user_id, q.exam_type,
                COUNT(*) FILTER (WHERE qp.mastered) AS mastered
           FROM question_progress qp
           JOIN questions q ON q.id = qp.question_id
          WHERE qp.user_id = ANY($1)
          GROUP BY qp.user_id, q.exam_type`,
        [userIds],
      ),
      pool.query(
        `SELECT user_id, exam_type,
                COUNT(*)                       AS taken,
                COUNT(*) FILTER (WHERE passed) AS passed
           FROM exam_attempts
          WHERE user_id = ANY($1) AND completed_at IS NOT NULL
          GROUP BY user_id, exam_type`,
        [userIds],
      ),
      pool.query(
        // study_streaks is read for its timestamp alone: it is the one table
        // that records when a learner last answered anything on a track.
        `SELECT user_id, exam_type, last_answer_at
           FROM study_streaks WHERE user_id = ANY($1)`,
        [userIds],
      ),
    ]);

    // Content totals per track, so a track scores against its own item count.
    const totalsByTrack = new Map<string, number>();
    for (const row of contentTotals.rows) {
      totalsByTrack.set(`${row.exam_type} ${row.kind}`, Number(row.total));
    }
    const totalFor = (track: ExamType, kind: string) =>
      totalsByTrack.get(`${track} ${kind}`) ?? 0;

    const flashcardsBy = indexByTrack(flashcards.rows);
    const memorizationBy = indexByTrack(memorization.rows);
    const questionsBy = indexByTrack(questions.rows);
    const attemptsBy = indexByTrack(attempts.rows);
    const streaksBy = indexByTrack(streaks.rows);

    const roster = users.map((user) => {
      const perTrack = tracks.map((track) => {
        const key = trackKey(user.id, track);
        const memorizationRow = memorizationBy.get(key);
        const attemptRow = attemptsBy.get(key);
        const streakRow = streaksBy.get(key);

        const flashcardCounts: Counts = {
          total: totalFor(track, "flashcards"),
          mastered: Number(flashcardsBy.get(key)?.mastered ?? 0),
        };
        const memorizationCounts: Counts = {
          total: totalFor(track, "memorization"),
          mastered: Number(memorizationRow?.mastered ?? 0),
        };
        const practiceCounts: Counts = {
          total: totalFor(track, "questions"),
          mastered: Number(questionsBy.get(key)?.mastered ?? 0),
        };

        return {
          track,
          readiness: Math.round(
            (pct(flashcardCounts.mastered, flashcardCounts.total) +
              pct(memorizationCounts.mastered, memorizationCounts.total) +
              pct(practiceCounts.mastered, practiceCounts.total)) /
              3,
          ),
          flashcards: flashcardCounts,
          memorization: memorizationCounts,
          practice: practiceCounts,
          answered: Number(memorizationRow?.answered ?? 0),
          correct: Number(memorizationRow?.correct ?? 0),
          taken: Number(attemptRow?.taken ?? 0),
          passes: cappedPasses(Number(attemptRow?.passed ?? 0)),
          lastActivity: (streakRow?.last_answer_at as string | null) ?? null,
        };
      });

      const sum = (pick: (row: (typeof perTrack)[number]) => number) =>
        perTrack.reduce((running, row) => running + pick(row), 0);

      // Every track weighs the same here, whatever its item count.
      const readiness = Math.round(
        sum((row) => row.readiness) / perTrack.length,
      );

      // A track is passed only once the reviewee has cleared the practice exam
      // PASSES_REQUIRED times, so the roster reports how many tracks are done
      // rather than an average that hid whether anything was finished.
      const examTracks = perTrack.map((row) => ({
        examType: row.track,
        taken: row.taken,
        passes: row.passes,
        required: PASSES_REQUIRED,
        passed: hasPassedTrack(row.passes),
      }));

      const answered = sum((row) => row.answered);
      const lastActivity =
        perTrack
          .map((row) => row.lastActivity)
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1) ?? null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image ?? null,
        // Null when the account predates invite-only signup.
        manager: user.manager_id
          ? {
              id: user.manager_id,
              name: user.manager_name,
              email: user.manager_email,
              role: user.manager_role as "ADMIN" | "MANAGER",
              image: user.manager_image ?? null,
            }
          : null,
        readiness,
        status: readinessStatus(readiness),
        flashcards: {
          total: sum((row) => row.flashcards.total),
          mastered: sum((row) => row.flashcards.mastered),
        },
        memorize: {
          total: sum((row) => row.memorization.total),
          mastered: sum((row) => row.memorization.mastered),
          accuracy: pct(
            sum((row) => row.correct),
            answered,
          ),
        },
        practice: {
          total: sum((row) => row.practice.total),
          mastered: sum((row) => row.practice.mastered),
        },
        practiceExam: {
          taken: sum((row) => row.taken),
          passedTracks: examTracks.filter((row) => row.passed).length,
          tracks: examTracks,
        },
        activity: { lastActivity },
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
