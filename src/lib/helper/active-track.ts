import type { ExamType } from "@/lib/types/common";

export type TrackActivity = Partial<Record<ExamType, string | null>>;

/**
 * Picks the track the learner touched most recently.
 *
 * The dashboard used to mark the track with the highest overall percentage as
 * active, which meant the badge sat on whichever track was furthest along
 * rather than the one being studied, and ties always fell to the first entry
 * in examTypes (VUL), so VUL kept the badge no matter what was opened.
 */
export function pickActiveTrack(
  tracks: readonly ExamType[],
  activity: TrackActivity,
): ExamType | null {
  let best: ExamType | null = null;
  let bestTime = -Infinity;

  for (const track of tracks) {
    const stamp = activity[track];
    if (!stamp) continue;

    const time = Date.parse(stamp);
    if (Number.isNaN(time) || time <= bestTime) continue;

    best = track;
    bestTime = time;
  }

  return best;
}

/**
 * Lists the tracks the learner touched most recently, newest first.
 *
 * Quick Access uses this to surface where study left off. Tracks with no
 * recorded activity are left out, so a fresh account shows nothing rather than
 * an arbitrary slice of examTypes.
 */
export function recentTracks(
  tracks: readonly ExamType[],
  activity: TrackActivity,
  limit = 3,
): ExamType[] {
  return tracks
    .map((track) => ({ track, time: Date.parse(activity[track] ?? "") }))
    .filter((entry) => !Number.isNaN(entry.time))
    .sort((a, b) => b.time - a.time)
    .slice(0, limit)
    .map((entry) => entry.track);
}
