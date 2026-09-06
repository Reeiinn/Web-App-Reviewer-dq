import type { StreakUpdate } from "@/lib/helper/streaks";
import type { ExamType } from "./common";

/** One row of GET /api/streaks: the learner's run on a single track. */
export type StreakRow = {
  exam_type: ExamType;
  current_streak: number;
  best_streak: number;
  last_answer_at: string | null;
};

/** The streak returned alongside a saved answer. */
export type StreakResult = StreakUpdate & {
  milestone: number | null;
};
