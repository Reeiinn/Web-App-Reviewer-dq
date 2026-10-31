import { examLabels, examTypes, type ExamType } from "@/lib/types/common";
import type { ExamResults } from "@/lib/types/exam-results";

/**
 * The reviewee's exam pick, as the screens see it.
 *
 * The pick itself is the focus-tracks rows (src/server/data/focus-tracks.ts):
 * none saved means all four. On top of that, a reviewee who has never picked
 * is asked to, once, and an exam carrying a licensing result cannot be dropped.
 *
 * Imported by the edge middleware, so nothing here may pull in a dependency:
 * plain functions over plain values.
 */

/**
 * The pick a session carries: the tracks, or null while nothing has been
 * picked. Null rather than all four, so the middleware can tell "never asked"
 * from "chose all four".
 */
export type ExamPick = ExamType[] | null;

/** The tracks to show: the picked ones, or all four before any pick. */
export const tracksFor = (
  picked: readonly ExamType[] | null | undefined,
): ExamType[] =>
  picked ? examTypes.filter((track) => picked.includes(track)) : [...examTypes];

/** Whether a track is among those being shown. */
export const inFocus = (
  picked: readonly ExamType[] | null | undefined,
  track: ExamType,
) => !picked || picked.includes(track);

/**
 * Staff never pick: they do not study. An undefined pick is a token minted
 * before the claim existed, and is asked the same as null.
 */
export const needsExamChoice = (
  role: string | null | undefined,
  picked: readonly ExamType[] | null | undefined,
) => role === "USER" && picked == null;

/**
 * A track that carries a licensing result but is missing from a new pick.
 *
 * Dropping it would leave a result pointing at an exam the reviewee no longer
 * has, so the pick is refused instead.
 */
export function markedTrackDropped(
  next: readonly ExamType[],
  results: ExamResults,
): ExamType | null {
  return (
    examTypes.find((track) => results[track] && !next.includes(track)) ?? null
  );
}

/** The refusal's message, naming the exam it would orphan. */
export const markedTrackMessage = (track: ExamType) =>
  `${examLabels[track]} has a recorded exam result and can't be removed.`;

/**
 * The picker's starting ticks: the saved pick, plus any exam carrying a
 * result.
 *
 * A mark and a change of pick can land in the same moment, leaving a result
 * on an exam the pick no longer has. Showing that exam unticked and locked
 * would make every save fail with nothing the reviewee could do about it, so
 * it starts ticked and the save puts it back.
 */
export function initialPicks(
  picked: readonly ExamType[] | null,
  results: ExamResults,
): Set<ExamType> {
  return new Set([
    ...(picked ?? []),
    ...examTypes.filter((track) => results[track]),
  ]);
}
