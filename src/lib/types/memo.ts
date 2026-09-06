import type { StreakResult } from "./streak";
import { ExamType } from "./common";

export interface MemorizationChoice {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface Memorization {
  id: string;
  exam_type: ExamType;
  category: string;
  text: string;
  choices: MemorizationChoice[];
}

export interface MemorizationProgress {
  id: string;
  user_id: string;
  memorization_id: string;
  selected_choice_id: string | null;
  is_correct: boolean | null;
  reviewed_at: string;
  mastered: boolean;
}

/** POST /api/memorization/[id]/progress: the saved answer plus the updated streak. */
export interface MemorizationProgressResponse extends MemorizationProgress {
  streak: StreakResult;
}
