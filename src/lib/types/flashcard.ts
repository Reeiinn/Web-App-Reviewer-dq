import type { StreakResult } from "./streak";
import { ExamType } from "./common";

/** One option of the exam question a flashcard was drawn from. */
export interface FlashcardChoice {
  id: string;
  text: string;
}

export interface Flashcard {
  id: string;
  exam_type: ExamType;
  category: string;
  front: string;
  back: string;
  /**
   * The original question's options, so a "which of the following" card can be
   * answered before it is flipped. Empty when the card has no question behind
   * it, in which case the front renders as the prompt alone.
   */
  choices?: FlashcardChoice[];
}

export interface FlashcardProgress {
  id: string;
  user_id: string;
  flashcard_id: string;
  reviewed_at: string;
  mastered: boolean;
}

/** POST /api/flashcards/[id]/progress: the saved review plus the updated streak. */
export interface FlashcardProgressResponse extends FlashcardProgress {
  streak: StreakResult;
}
