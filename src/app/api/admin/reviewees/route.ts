import { auth } from "@/lib/auth";
import { listReviewees, touchLastSeen } from "@/server/data/staff";
import {
  masteryPercent,
  readinessStatus,
  trackReadiness,
} from "@/lib/helper/readiness";
import { examTypes, type ExamType } from "@/lib/types/common";
import {
  PASSES_REQUIRED,
  cappedPasses,
  hasPassedTrack,
} from "@/lib/helper/practice-exam";
import { latestActivity } from "@/lib/helper/track-counts";
import { getFocusTracksFor } from "@/server/data/focus-tracks";
import { resultsFor } from "@/server/data/exam-results";
import { getTrackCountsFor } from "@/server/data/mastery";
import { NextResponse } from "next/server";

const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

/**
 * Roster for the admin console. ADMIN sees everyone; MANAGER sees only their
 * own reports. Every column here is backed by a real table — the mockup's
 * cohort badges and scheduled exam dates have no data behind them and are
 * deliberately absent.
 *
 * Accepts ?exam_type=<track> to scope every number to one track. Without it,
 * readiness is the mean of the per-track readiness scores over the
 * reviewee's focus tracks (all four until they choose), so a track counts
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
    const users = await listReviewees(role === "ADMIN" ? null : currentUserId);
    if (users.length === 0) return NextResponse.json([]);

    const userIds = users.map((user) => user.id);

    // Counts per reviewee and track come from the mastery views, the same
    // ones the dashboard reads, so the two can no longer disagree.
    // Every track is counted once for everybody; each reviewee is then scored
    // on their own focus tracks. A ?exam_type zoom overrides focus, so staff
    // can look at one track across the whole roster.
    const [countsByUser, focusByUser, marksByUser] = await Promise.all([
      getTrackCountsFor(userIds, tracks),
      getFocusTracksFor(userIds),
      resultsFor(userIds),
    ]);

    const roster = users.map((user) => {
      const focus = focusByUser.get(user.id)!;
      const scored = selected ? [selected] : focus.tracks;
      const perTrack = (countsByUser.get(user.id) ?? [])
        .filter((t) => scored.includes(t.examType))
        .map((t) => ({
          track: t.examType,
          readiness: trackReadiness({
            flashcards: t.flashcards,
            memorization: t.memorization,
            practice: t.practice,
          }),
          flashcards: t.flashcards,
          memorization: t.memorization,
          practice: t.practice,
          answered: t.memorizationAnswered,
          correct: t.memorizationCorrect,
          taken: t.attemptsTaken,
          passes: cappedPasses(t.passingAttempts),
          // study_streaks is the one table that records when a learner last
          // answered anything on a track.
          lastActivity: t.lastAnswerAt,
        }));

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
      const lastActivity = latestActivity(
        perTrack.map((row) => row.lastActivity),
      );

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image ?? null,
        // Null when the account predates invite-only signup.
        manager: user.manager
          ? {
              id: user.manager.id,
              name: user.manager.name,
              email: user.manager.email,
              role: user.manager.role as "ADMIN" | "MANAGER",
              image: user.manager.image ?? null,
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
        // The per-track figures the row's own columns average away. The
        // roster's headline number cannot say which exam a reviewee is
        // actually ready for, so the table hands these to a dialog.
        byExam: perTrack.map((row) => ({
          examType: row.track,
          readiness: row.readiness,
          flashcards: row.flashcards,
          memorization: row.memorization,
          practice: row.practice,
          percent: {
            flashcards: masteryPercent(row.flashcards),
            memorization: masteryPercent(row.memorization),
            practice: masteryPercent(row.practice),
          },
        })),
        practiceExam: {
          taken: sum((row) => row.taken),
          passedTracks: examTracks.filter((row) => row.passed).length,
          tracks: examTracks,
        },
        activity: { lastActivity },
        // Which tracks this row is scored on, and whether the reviewee chose
        // them (false means none chosen yet, so all four).
        focusTracks: focus,
        // The real licensing exam's outcome per exam, as staff recorded it.
        results: marksByUser.get(user.id) ?? {},
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
