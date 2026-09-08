import { PASSES_REQUIRED, cappedPasses } from "./practice-exam";

/**
 * What a track's certificate cost the learner.
 *
 * The certificate itself only says a track was cleared. The record is the
 * other half of that story — how many sittings it took to get there — and it
 * is read off the sittings rather than off `user_progress.pass_count`, for the
 * same reason the result screen counts passes off the attempts: a running
 * total can drift, the rows cannot.
 */

/** One finished sitting of a track's practice exam. */
export type Sitting = {
  passed: boolean;
  score: number;
  total_items: number;
  /** ISO timestamp. Only completed sittings belong here. */
  completed_at: string;
};

export type TrackRecord = {
  /** Passing sittings, capped at the target. */
  passes: number;
  /**
   * Sittings taken up to and including the one that cleared the track — the
   * tries the certificate cost. While a track is still open this is simply
   * every sitting so far.
   */
  tries: number;
  /** The failed sittings among those tries. */
  failed: number;
  /** Every completed sitting, revision after the fifth pass included. */
  total: number;
  /** The best percentage from any sitting counted in `tries`. */
  bestPct: number;
  /** ISO timestamp of the first sitting, or null if the track is untouched. */
  firstAt: string | null;
  /** ISO timestamp of the sitting that took the count to the target. */
  clearedAt: string | null;
  cleared: boolean;
};

/** A sitting's raw score as a whole percentage. */
export const scorePct = (score: number, totalItems: number) =>
  totalItems > 0 ? Math.round((score / totalItems) * 100) : 0;

/** "1 try", "7 tries" — the counter as it is written in a sentence. */
export const triesLabel = (tries: number) =>
  `${tries} ${tries === 1 ? "try" : "tries"}`;

/** The standing of a track nobody has sat yet. */
export const emptyRecord = (): TrackRecord => ({
  passes: 0,
  tries: 0,
  failed: 0,
  total: 0,
  bestPct: 0,
  firstAt: null,
  clearedAt: null,
  cleared: false,
});

/**
 * Reads a track's record off its completed sittings.
 *
 * Sittings are ordered here rather than trusted to arrive in order, because
 * the count of tries is only meaningful against the sitting that cleared the
 * track, and which one that was depends entirely on the order.
 *
 * Sittings taken after the fifth pass are revision: they are counted in
 * `total` but left out of `tries`, so a learner who keeps practising is never
 * shown a rising price for a certificate they already hold.
 */
export function trackRecord(sittings: Sitting[]): TrackRecord {
  const ordered = [...sittings].sort(
    (a, b) => Date.parse(a.completed_at) - Date.parse(b.completed_at),
  );

  const record = emptyRecord();
  record.total = ordered.length;
  record.firstAt = ordered[0]?.completed_at ?? null;

  for (const sitting of ordered) {
    if (record.cleared) break;

    record.tries += 1;
    record.bestPct = Math.max(
      record.bestPct,
      scorePct(sitting.score, sitting.total_items),
    );

    if (!sitting.passed) {
      record.failed += 1;
      continue;
    }

    record.passes = cappedPasses(record.passes + 1);
    if (record.passes >= PASSES_REQUIRED) {
      record.cleared = true;
      record.clearedAt = sitting.completed_at;
    }
  }

  return record;
}
