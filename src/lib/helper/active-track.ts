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

