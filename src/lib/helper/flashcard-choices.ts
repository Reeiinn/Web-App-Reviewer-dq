import type { FlashcardChoice } from "@/lib/types/flashcard";

export type QuestionForCard = {
  examType: string;
  text: string;
  choices: { id: string; text: string; isCorrect: boolean }[];
};

/**
 * The options of the exam question a flashcard was drawn from, so a "which
 * of the following" card can be answered before it is flipped.
 *
 * A card links to a question by track and by its front being the question's
 * text. When several questions share that text, the one whose correct option
 * reads exactly like the card's back is the card's; when none does, the card
 * shows no options rather than another question's. `questions` must already
 * hold each question's choices in display (sort_order) order.
 */
export function choicesForCard(
  card: { examType: string; front: string; back: string },
  questions: QuestionForCard[],
): FlashcardChoice[] {
  const candidates = questions.filter(
    (q) => q.examType === card.examType && q.text === card.front,
  );
  const source =
    candidates.length === 1
      ? candidates[0]
      : candidates.find((q) =>
          q.choices.some((c) => c.isCorrect && c.text === card.back),
        );
  return source?.choices.map(({ id, text }) => ({ id, text })) ?? [];
}
