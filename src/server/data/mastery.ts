import "server-only";
import prisma from "@/server/db/prisma";
import {
  buildTrackCounts,
  tracksWithContent,
  type ContentTotalsRow,
  type ProgressRow,
  type TrackCounts,
} from "@/lib/helper/track-counts";
import type { ExamType } from "@/lib/types/common";

/**
 * The only reader of the mastery views (track_content_totals,
 * user_track_progress). The dashboard, the eligibility gate and the staff
 * roster all count through here, so they cannot disagree. Scoring stays in
 * the pure helpers (readiness, eligibility, practice-exam).
 *
 * The views are read with $queryRaw rather than Prisma `view` models, which
 * are still a preview feature; this file is the one place raw SQL remains.
 */

export async function getContentTotals(): Promise<ContentTotalsRow[]> {
  return prisma.$queryRaw<ContentTotalsRow[]>`
    SELECT exam_type::text AS exam_type, flashcards, memorization, questions
      FROM track_content_totals`;
}

async function getProgressRows(userIds: string[]): Promise<ProgressRow[]> {
  return prisma.$queryRaw<ProgressRow[]>`
    SELECT user_id::text AS user_id, exam_type::text AS exam_type,
           flashcards_mastered, memorization_mastered, memorization_answered,
           memorization_correct, questions_mastered, attempts_taken,
           passing_attempts, last_reviewed_at, last_answer_at
      FROM user_track_progress
     WHERE user_id = ANY(${userIds}::uuid[])`;
}

const byTrack = <T extends { exam_type: string }>(rows: T[]) =>
  new Map(rows.map((row) => [row.exam_type, row]));

/** One user, every track that holds content, in the standard order. */
export async function getTrackCounts(userId: string): Promise<TrackCounts[]> {
  const [totals, progress] = await Promise.all([
    getContentTotals(),
    getProgressRows([userId]),
  ]);
  const totalsBy = byTrack(totals);
  const progressBy = byTrack(progress);
  return tracksWithContent(totals).map((track) =>
    buildTrackCounts(track, totalsBy.get(track), progressBy.get(track)),
  );
}

/** One user, one named track; nought of nought when the track is empty. */
export async function getTrackCount(
  userId: string,
  examType: ExamType,
): Promise<TrackCounts> {
  const [totals, progress] = await Promise.all([
    getContentTotals(),
    getProgressRows([userId]),
  ]);
  return buildTrackCounts(
    examType,
    byTrack(totals).get(examType),
    byTrack(progress).get(examType),
  );
}

/**
 * Many users, the given tracks, two queries. Every user gets one entry per
 * requested track, zero-filled, so the roster never has to ask what is
 * missing.
 */
export async function getTrackCountsFor(
  userIds: string[],
  tracks: readonly ExamType[],
): Promise<Map<string, TrackCounts[]>> {
  const result = new Map<string, TrackCounts[]>();
  if (userIds.length === 0) return result;

  const [totals, progress] = await Promise.all([
    getContentTotals(),
    getProgressRows(userIds),
  ]);
  const totalsBy = byTrack(totals);
  const progressBy = new Map(
    progress.map((row) => [`${row.user_id} ${row.exam_type}`, row]),
  );

  for (const userId of userIds) {
    result.set(
      userId,
      tracks.map((track) =>
        buildTrackCounts(
          track,
          totalsBy.get(track),
          progressBy.get(`${userId} ${track}`),
        ),
      ),
    );
  }
  return result;
}
