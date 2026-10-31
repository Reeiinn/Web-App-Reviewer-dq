import type { ExamType } from "@/lib/types/common";

/**
 * How the dashboard lays out however many exams a reviewee chose.
 *
 * The track grid is two columns. Two and four fill it; one and three leave a
 * hole, so one card spans the row instead. With three, that is the track being
 * studied, so the card a reviewee came back for is the one on top.
 */
export function trackLayout(
  chosen: readonly ExamType[],
  active: ExamType | null,
): { order: ExamType[]; wide: ExamType | null } {
  if (chosen.length % 2 === 0) return { order: [...chosen], wide: null };

  const wide = active && chosen.includes(active) ? active : chosen[0];
  return {
    order: [wide, ...chosen.filter((track) => track !== wide)],
    wide,
  };
}
