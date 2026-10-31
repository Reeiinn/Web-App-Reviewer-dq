import type { Question } from "@/lib/types/questions";

/**
 * Who may read a track's correct answers, and the paper without them.
 *
 * A sitting is scored on the server, so the questions a reviewee answers never
 * need to say which option is right. The key is handed over only once it can
 * no longer help a sitting: never while one is open, and not before the first.
 * Finishing a sitting shows its answers, so a reviewee who has finished one
 * has seen them; the rule closes the exam in progress, not later revision.
 */

export const OPEN_SITTING_MESSAGE =
  "Finish your open practice exam before reviewing the answers.";

export const NOT_SAT_MESSAGE =
  "Finish this practice exam once before reviewing the answers.";

export function answerKeyAccess({
  role,
  licensed,
  openSitting,
  finishedSittings,
}: {
  role: string;
  /** Staff recorded a pass on the real exam, which closes its sittings. */
  licensed: boolean;
  openSitting: boolean;
  finishedSittings: number;
}): { ok: true } | { ok: false; error: string } {
  if (role !== "USER" || licensed) return { ok: true };
  if (openSitting) return { ok: false, error: OPEN_SITTING_MESSAGE };
  if (finishedSittings === 0) return { ok: false, error: NOT_SAT_MESSAGE };
  return { ok: true };
}

/** The paper as it is sat: no marked option, no explanation to give one away. */
export const withoutAnswers = (questions: readonly Question[]): Question[] =>
  questions.map((question) => ({
    ...question,
    explanation: null,
    choices: question.choices.map(({ id, text }) => ({ id, text })),
  }));
