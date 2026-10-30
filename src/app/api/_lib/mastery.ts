import { deriveEligibility } from "@/lib/helper/eligibility";
import { eligibleTracks } from "@/lib/helper/track-counts";
import type { ExamType } from "@/lib/types/common";
import type { Eligibility } from "@/lib/types/eligibility";
import { getFocusTracks } from "@/server/data/focus-tracks";
import { getTrackCount, getTrackCounts } from "@/server/data/mastery";

/**
 * Practice-exam eligibility for every focus track with decks, keyed by exam_type.
 * The counts come from the mastery views, the same ones the dashboard and the
 * roster read.
 *
 * A track with no material of one kind still answers — zero of zero, which
 * deriveEligibility already refuses to call a qualification.
 */
export async function fetchAllEligibility(
  userId: string,
): Promise<Record<string, Eligibility>> {
  const [counts, focus] = await Promise.all([
    getTrackCounts(userId),
    getFocusTracks(userId),
  ]);
  const tracks = eligibleTracks(
    counts.filter((t) => focus.tracks.includes(t.examType)),
  );
  return Object.fromEntries(
    tracks.map((t) => [
      t.examType,
      deriveEligibility(t.flashcards, t.memorization),
    ]),
  );
}

/**
 * The same for one named track, for the practice-exam gate, which only ever
 * asks about the track someone is trying to sit.
 */
export async function fetchEligibility(
  userId: string,
  examType: ExamType,
): Promise<Eligibility> {
  const t = await getTrackCount(userId, examType);
  return deriveEligibility(t.flashcards, t.memorization);
}
