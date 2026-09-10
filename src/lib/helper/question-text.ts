export type SplitQuestion = {
  prompt: string;
  statements: string[];
};

export type LabelledChoice = {
  id: string;
  letter: string;
  text: string;
};

/** A, B, C … so a choice is named the way the exam paper names it. */
function letterFor(index: number): string {
  return String.fromCharCode(65 + index);
}

/**
 * An option that stands for the others rather than competing with them.
 *
 * Anchored and closed at the phrase, so a choice that only mentions it —
 * "All of the above policies lapse after the grace period" — stays an
 * ordinary option.
 */
const SUMMARY_CHOICE = /^(all|none|any or all) of the above\b[.\s]*$/i;

/**
 * Labels a question's choices for display.
 *
 * A "which of the following" card is unanswerable without its options, so the
 * flashcard front lists them. Blank rows are dropped before lettering, so a
 * gap in the data never costs a letter or renders an empty chip.
 *
 * "All of the above" is pushed last. Choices are stored without an order of
 * their own, so the summary option can otherwise land at B with real options
 * still to come, where it reads as a statement about nothing. Every other
 * option keeps the order it arrived in.
 */
export function labelChoices(
  choices: { id: string; text: string }[] | undefined,
): LabelledChoice[] {
  if (!choices?.length) return [];

  const cleaned = choices
    .map((choice) => ({ id: choice.id, text: choice.text.trim() }))
    .filter((choice) => choice.text.length > 0);

  return [
    ...cleaned.filter((choice) => !SUMMARY_CHOICE.test(choice.text)),
    ...cleaned.filter((choice) => SUMMARY_CHOICE.test(choice.text)),
  ].map((choice, index) => ({
    id: choice.id,
    letter: letterFor(index),
    text: choice.text,
  }));
}

/**
 * Splits a question from any roman-numeral statements it enumerates, so the
 * two can be rendered apart instead of running together as one paragraph.
 *
 * Shared by the flashcard and memorization screens so both read the same way.
 */
export function splitStatements(text: string): SplitQuestion {
  const matches = [...text.matchAll(/(?:^|\s)([IVXLCDM]+\.)\s*/g)];
  if (!matches.length) return { prompt: text.trim(), statements: [] };

  const starts = matches.map(
    (match) => (match.index ?? 0) + match[0].indexOf(match[1]),
  );

  return {
    prompt: text.slice(0, starts[0]).trim(),
    statements: starts.map((start, index) =>
      text.slice(start, starts[index + 1]).trim(),
    ),
  };
}
