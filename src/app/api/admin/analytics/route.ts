import { auth } from "@/lib/auth";
import { touchLastSeen } from "@/app/api/_lib/presence-store";
import pool from "@/lib/db";
import { PASSES_REQUIRED } from "@/lib/helper/practice-exam";
import { examTypes, type ExamType } from "@/lib/types/common";
import { NextResponse } from "next/server";

/**
 * The cohort, rather than one reviewee at a time.
 *
 * The console answered "how is this person doing" well and "how is the intake
 * doing" not at all: a Sales Manager had a roster of individuals, a tile with
 * three counts on it, and no way to see a track that is going badly for
 * everybody, a month that has gone quiet, or a Field Manager whose recruits
 * never start. The learner analytics screen is no help — it charts the signed-in
 * account's own mastery, and staff have none.
 *
 * Every figure here is scoped the way the roster is: an admin sees the whole
 * intake, a field manager sees the reviewees they recruited.
 */

type TrackRow = {
  examType: ExamType;
  /** Reviewees in scope who have touched this track at all. */
  active: number;
  flashcardPct: number;
  memorizePct: number;
  practicePct: number;
  /** Sittings completed, and how many of those passed. */
  sittings: number;
  passes: number;
  /** Reviewees who have cleared the track outright. */
  cleared: number;
};

type ManagerRow = {
  id: string;
  name: string;
  email: string;
  recruits: number;
  /** Recruits who have answered anything at all. */
  started: number;
  /** Passing sittings so far against the five each track needs, as a percentage. */
  averagePct: number;
};

type WeekRow = { week: string; sittings: number; passes: number };

const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

/** Comma-separated, with anything containing a comma or a quote wrapped. */
const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const toCsv = (headers: string[], rows: (string | number)[][]) =>
  [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role, id: currentUserId } = session.user;
  if (role !== "ADMIN" && role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await touchLastSeen(currentUserId);

  // Null means "every reviewee": the query reads it as no scoping at all, so
  // one statement serves both roles rather than two that could drift apart.
  const scopeId = role === "ADMIN" ? null : currentUserId;
  const format = new URL(req.url).searchParams.get("format");

  try {
    const scope = `
      SELECT id FROM users
       WHERE role = 'USER' AND deleted_at IS NULL
         AND ($1::uuid IS NULL OR manager_id = $1::uuid)
    `;

    const [totals, mastery, exams, weeks, managers, cohort] = await Promise.all(
      [
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

        // Mastered items per track, summed over everyone in scope. Averaging
        // this against the track's own size is what makes the tracks
        // comparable when one has sixty items and another forty-nine.
        pool.query(
          `WITH scope AS (${scope})
           SELECT f.exam_type, 'flashcards' AS kind,
                  COUNT(*) FILTER (WHERE fp.mastered) AS mastered,
                  COUNT(DISTINCT fp.user_id) AS learners
             FROM flashcard_progress fp
             JOIN flashcards f ON f.id = fp.flashcard_id
            WHERE fp.user_id IN (SELECT id FROM scope)
            GROUP BY f.exam_type
           UNION ALL
           SELECT m.exam_type, 'memorization',
                  COUNT(*) FILTER (WHERE mp.mastered),
                  COUNT(DISTINCT mp.user_id)
             FROM memorization_progress mp
             JOIN memorization m ON m.id = mp.memorization_id
            WHERE mp.user_id IN (SELECT id FROM scope)
            GROUP BY m.exam_type
           UNION ALL
           SELECT q.exam_type, 'questions',
                  COUNT(*) FILTER (WHERE qp.mastered),
                  COUNT(DISTINCT qp.user_id)
             FROM question_progress qp
             JOIN questions q ON q.id = qp.question_id
            WHERE qp.user_id IN (SELECT id FROM scope)
            GROUP BY q.exam_type`,
          [scopeId],
        ),

        pool.query(
          `WITH scope AS (${scope}),
           per_learner AS (
             SELECT user_id, exam_type,
                    COUNT(*) FILTER (WHERE passed) AS passes
               FROM exam_attempts
              WHERE user_id IN (SELECT id FROM scope)
                AND completed_at IS NOT NULL
              GROUP BY user_id, exam_type
           )
           SELECT a.exam_type,
                  COUNT(*) AS sittings,
                  COUNT(*) FILTER (WHERE a.passed) AS passes,
                  (SELECT COUNT(*) FROM per_learner p
                    WHERE p.exam_type = a.exam_type
                      AND p.passes >= $2) AS cleared
             FROM exam_attempts a
            WHERE a.user_id IN (SELECT id FROM scope)
              AND a.completed_at IS NOT NULL
            GROUP BY a.exam_type`,
          [scopeId, PASSES_REQUIRED],
        ),

        // Eight weeks of sittings: a cohort going quiet is the thing a roster
        // of current numbers cannot show.
        pool.query(
          `WITH scope AS (${scope})
           SELECT to_char(date_trunc('week', completed_at), 'YYYY-MM-DD') AS week,
                  COUNT(*) AS sittings,
                  COUNT(*) FILTER (WHERE passed) AS passes
             FROM exam_attempts
            WHERE user_id IN (SELECT id FROM scope)
              AND completed_at IS NOT NULL
              AND completed_at >= date_trunc('week', now()) - interval '7 weeks'
            GROUP BY 1
            ORDER BY 1`,
          [scopeId],
        ),

        // Only the Sales Manager compares Field Managers; a field manager has
        // no colleagues to be ranked against here.
        role === "ADMIN"
          ? pool.query(
              `SELECT m.id, m.name, m.email,
                      COUNT(r.id) AS recruits,
                      COUNT(r.id) FILTER (
                        WHERE EXISTS (
                          SELECT 1 FROM study_streaks s WHERE s.user_id = r.id
                        )
                      ) AS started,
                      COALESCE((
                        SELECT COUNT(*) FROM exam_attempts a
                         WHERE a.user_id IN (
                                 SELECT id FROM users
                                  WHERE manager_id = m.id AND role = 'USER'
                                    AND deleted_at IS NULL
                               )
                           AND a.passed AND a.completed_at IS NOT NULL
                      ), 0) AS passes
                 FROM users m
                 LEFT JOIN users r
                        ON r.manager_id = m.id AND r.role = 'USER'
                       AND r.deleted_at IS NULL
                WHERE m.role = 'MANAGER' AND m.deleted_at IS NULL
                GROUP BY m.id
                ORDER BY recruits DESC, m.name ASC`,
            )
          : Promise.resolve({ rows: [] }),

        pool.query(
          `WITH scope AS (${scope}) SELECT COUNT(*) AS total FROM scope`,
          [scopeId],
        ),
      ],
    );

    const totalFor = (track: string, kind: string) =>
      Number(
        totals.rows.find((row) => row.exam_type === track && row.kind === kind)
          ?.total ?? 0,
      );

    const masteryFor = (track: string, kind: string) => {
      const row = mastery.rows.find(
        (item) => item.exam_type === track && item.kind === kind,
      );
      return {
        mastered: Number(row?.mastered ?? 0),
        learners: Number(row?.learners ?? 0),
      };
    };

    const reviewees = Number(cohort.rows[0]?.total ?? 0);

    const tracks: TrackRow[] = examTypes.map((examType) => {
      const flashcards = masteryFor(examType, "flashcards");
      const memorize = masteryFor(examType, "memorization");
      const practice = masteryFor(examType, "questions");
      const exam = exams.rows.find((row) => row.exam_type === examType);

      // Each track is scored against what everyone in scope could have
      // mastered on it, so a track nobody has opened reads 0 rather than
      // dividing by the handful who did.
      const ceiling = (kind: string) => totalFor(examType, kind) * reviewees;

      return {
        examType,
        active: Math.max(
          flashcards.learners,
          memorize.learners,
          practice.learners,
        ),
        flashcardPct: pct(flashcards.mastered, ceiling("flashcards")),
        memorizePct: pct(memorize.mastered, ceiling("memorization")),
        practicePct: pct(practice.mastered, ceiling("questions")),
        sittings: Number(exam?.sittings ?? 0),
        passes: Number(exam?.passes ?? 0),
        cleared: Number(exam?.cleared ?? 0),
      };
    });

    const managerRows: ManagerRow[] = managers.rows.map((row) => {
      const recruits = Number(row.recruits);
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        recruits,
        started: Number(row.started),
        // Passing sittings per recruit, against the five a track needs, is the
        // one figure that says whether an intake is converting.
        averagePct: pct(
          Number(row.passes),
          recruits * PASSES_REQUIRED * examTypes.length,
        ),
      };
    });

    if (format === "csv") {
      const csv = toCsv(
        [
          "track",
          "reviewees_active",
          "flashcards_pct",
          "memorize_pct",
          "practice_pct",
          "sittings",
          "passes",
          "learners_cleared",
        ],
        tracks.map((track) => [
          track.examType,
          track.active,
          track.flashcardPct,
          track.memorizePct,
          track.practicePct,
          track.sittings,
          track.passes,
          track.cleared,
        ]),
      );

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="cohort-${new Date()
            .toISOString()
            .slice(0, 10)}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const weekly: WeekRow[] = weeks.rows.map((row) => ({
      week: row.week,
      sittings: Number(row.sittings),
      passes: Number(row.passes),
    }));

    return NextResponse.json({
      scope: role === "ADMIN" ? "all" : "own",
      reviewees,
      passesRequired: PASSES_REQUIRED,
      tracks,
      weekly,
      managers: managerRows,
    });
  } catch (error) {
    console.error("Error building cohort analytics:", error);
    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500 },
    );
  }
}
