/**
 * The rules a practice exam is scored and counted by.
 *
 * A track is not cleared by one lucky sitting: the learner has to pass the
 * practice exam five times before the track reads as passed. Every screen that
 * shows that progress — the exam result, the dashboard, analytics, the admin
 * roster — counts it the same way, so the numbers agree wherever they appear.
 */

/** Share of questions that has to be right for a single sitting to pass. */
export const PASSING_PERCENTAGE = 75;

/** Passing sittings needed before a track counts as passed. */
export const PASSES_REQUIRED = 5;

/** Passes never read above the target, however many extra sittings are taken. */
export const cappedPasses = (passes: number) =>
  Math.max(0, Math.min(PASSES_REQUIRED, Math.trunc(passes)));

/** "3 / 5", the counter shown wherever the track's progress appears. */
export const passesLabel = (passes: number) =>
  `${cappedPasses(passes)} / ${PASSES_REQUIRED}`;

/** True once the track is cleared. Extra sittings after that are revision. */
export const hasPassedTrack = (passes: number) => passes >= PASSES_REQUIRED;

/** Whether one sitting's raw score clears the bar. */
export const sittingPassed = (score: number, totalItems: number) =>
  totalItems > 0 && (score / totalItems) * 100 >= PASSING_PERCENTAGE;
