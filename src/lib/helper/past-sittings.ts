import type { Question } from "@/lib/types/questions";

/**
 * A reviewee's own finished sittings, read back.
 *
 * The answer-key review shows the whole bank with the right answers marked,
 * which says nothing about how this person did. This lays out one sitting as
 * it was sat: the paper in the order it was dealt, each of their picks beside
 * the right answer.
 */

export type AttemptAnswer = {
  question_id: string;
  selected_choice_id: string | null;
  is_correct: boolean;
};

export type ReviewRow = {
  questionId: string;
  /** Null when the question has since left the bank. */
  question: Question | null;
  /** The choice they picked, undefined if they left it blank. */
  chosen: string | undefined;
  correct: boolean;
};

export function reviewRows(
  order: readonly string[] | null,
  answers: readonly AttemptAnswer[],
  questions: readonly Question[],
): ReviewRow[] {
  const byQuestion = new Map(questions.map((item) => [item.id, item]));
  const answered = new Map(answers.map((row) => [row.question_id, row]));

  // A sitting from before the stored order has only its answers to go by.
  const ids = order ?? answers.map((row) => row.question_id);

  return ids.map((questionId) => {
    const answer = answered.get(questionId);
    return {
      questionId,
      question: byQuestion.get(questionId) ?? null,
      chosen: answer?.selected_choice_id ?? undefined,
      correct: answer?.is_correct ?? false,
    };
  });
}

/** "38 / 50 · 76%", the line a sitting is listed by. */
export function sittingSummary(score: number, totalItems: number): string {
  const percent = totalItems > 0 ? Math.round((score / totalItems) * 100) : 0;
  return `${score} / ${totalItems} · ${percent}%`;
}
