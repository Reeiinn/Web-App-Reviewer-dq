import type { MasteryCounts } from "@/lib/helper/readiness";
import { examTypes, type ExamType } from "@/lib/types/common";

/** A row of the track_content_totals view. */
export type ContentTotalsRow = {
  exam_type: string;
  flashcards: number;
  memorization: number;
  questions: number;
};

/** A row of the user_track_progress view. */
export type ProgressRow = {
  user_id: string;
  exam_type: string;
  flashcards_mastered: number;
  memorization_mastered: number;
  memorization_answered: number;
  memorization_correct: number;
  questions_mastered: number;
  attempts_taken: number;
  passing_attempts: number;
  /** Latest review in any study mode: what the dashboard calls activity. */
  last_reviewed_at: Date | null;
  /** Latest answer recorded by the streak: what the roster calls activity. */
  last_answer_at: Date | null;
};

/** One user's standing on one track, before any scoring is applied. */
export type TrackCounts = {
  examType: ExamType;
  flashcards: MasteryCounts;
  memorization: MasteryCounts;
  practice: MasteryCounts;
  memorizationAnswered: number;
  memorizationCorrect: number;
  attemptsTaken: number;
  passingAttempts: number;
  lastReviewedAt: Date | null;
  lastAnswerAt: Date | null;
};

export function buildTrackCounts(
  examType: ExamType,
  totals: ContentTotalsRow | undefined,
  progress: ProgressRow | undefined,
): TrackCounts {
  return {
    examType,
    flashcards: {
      mastered: progress?.flashcards_mastered ?? 0,
      total: totals?.flashcards ?? 0,
    },
    memorization: {
      mastered: progress?.memorization_mastered ?? 0,
      total: totals?.memorization ?? 0,
    },
    practice: {
      mastered: progress?.questions_mastered ?? 0,
      total: totals?.questions ?? 0,
    },
    memorizationAnswered: progress?.memorization_answered ?? 0,
    memorizationCorrect: progress?.memorization_correct ?? 0,
    attemptsTaken: progress?.attempts_taken ?? 0,
    passingAttempts: progress?.passing_attempts ?? 0,
    lastReviewedAt: progress?.last_reviewed_at ?? null,
    lastAnswerAt: progress?.last_answer_at ?? null,
  };
}

/**
 * The tracks the dashboard lists: every known track holding any content, in
 * the standard order. Legacy enum values (the pre-split 'IIAP') are skipped.
 */
export function tracksWithContent(totals: ContentTotalsRow[]): ExamType[] {
  const held = new Set(
    totals
      .filter((row) => row.flashcards + row.memorization + row.questions > 0)
      .map((row) => row.exam_type),
  );
  return examTypes.filter((track) => held.has(track));
}

/**
 * The tracks the eligibility map reports: those with flashcards or
 * memorization items. A track holding only practice questions has no gate to
 * report on, and the old query never listed one.
 */
export function eligibleTracks(counts: TrackCounts[]): TrackCounts[] {
  return counts.filter(
    (t) => t.flashcards.total > 0 || t.memorization.total > 0,
  );
}

/**
 * The most recent of a set of timestamps, as ISO text.
 *
 * The roster used to `.sort()` Date objects with no comparator, which sorts
 * their toString() — "Wed Oct 14 ..." after "Thu Oct 15 ..." — so the
 * reported last activity was whichever weekday name sorted last.
 */
export function latestActivity(stamps: (Date | null)[]): string | null {
  let latest: Date | null = null;
  for (const stamp of stamps) {
    if (stamp && (!latest || stamp.getTime() > latest.getTime())) {
      latest = stamp;
    }
  }
  return latest ? latest.toISOString() : null;
}
