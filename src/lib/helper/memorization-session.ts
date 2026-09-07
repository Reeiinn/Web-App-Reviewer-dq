import { restoreSession, type SavedSession } from "@/lib/helper/study-session";

/** The part of a question this module needs: everything is keyed by id. */
type Identified = { id: string };

export type RestoredMemorization<Q extends Identified> = {
  /** The saved order, reconciled against the questions the track holds now. */
  questions: Q[];
  index: number;
  ratings: Record<string, boolean>;
  /** Questions answered wrong in the saved session, for the redo pass. */
  wrong: Q[];
  answered: number;
  correct: number;
  /** False when the learner starts over: a fresh shuffle, question 1. */
  resumed: boolean;
};

/**
 * Rebuilds a memorization sitting from its saved position.
 *
 * Memorization used to reshuffle and start at question 1 on every visit, so
 * leaving for the dashboard threw the sitting away. It now saves the same shape
 * flashcards do, and the tallies come back off the saved ratings rather than a
 * second stored counter that could drift from them.
 */
export function restoreMemorization<Q extends Identified>(
  questions: Q[],
  saved: SavedSession | null,
): RestoredMemorization<Q> {
  const byId = new Map(questions.map((item) => [item.id, item]));

  const session = restoreSession(
    questions.map((item) => item.id),
    saved,
  );

  const ordered = session.order
    .map((id) => byId.get(id))
    .filter((item): item is Q => Boolean(item));

  const answers = Object.entries(session.ratings);

  return {
    questions: ordered,
    index: session.index,
    ratings: session.ratings,
    wrong: answers
      .filter(([, isCorrect]) => !isCorrect)
      .map(([id]) => byId.get(id))
      .filter((item): item is Q => Boolean(item)),
    answered: answers.length,
    correct: answers.filter(([, isCorrect]) => isCorrect).length,
    resumed: session.resumed,
  };
}
