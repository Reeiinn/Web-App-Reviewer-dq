import { splitStatements } from "@/lib/helper/question-text";
import type { Question } from "@/lib/types/questions";

/**
 * A question, with any roman-numeral statements set out as their own lines.
 *
 * These questions enumerate "I. … II. … III." inside the sentence, and run
 * together they read as one wall of text the learner has to parse before they
 * can even look at the choices. Flashcards and memorization already break them
 * out; this is the same split, so a question reads the same way in all three.
 */
export function QuestionText({ text }: { text: string }) {
  const { prompt, statements } = splitStatements(text);

  return (
    <>
      <h2 className="mt-2 font-bold leading-7">{prompt}</h2>
      {statements.length > 0 && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {statements.map((statement) => (
            <p
              key={statement}
              className="rounded-lg bg-muted px-3 py-2 text-sm leading-6"
            >
              {statement}
            </p>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * A question's choices, read rather than answered.
 *
 * Used by the screen after a sitting and by the review a passed track opens
 * into, so the two mark a paper the same way: the right answer always carries
 * its own colour, and a wrong pick is marked beside it when there is one.
 * `chosen` is undefined in a review that belongs to no sitting.
 */
export function ReviewChoices({
  question,
  chosen,
}: {
  question: Question;
  chosen: string | undefined;
}) {
  return (
    <div className="mt-4 flex flex-col gap-2.5">
      {question.choices.map((choice, choiceIndex) => {
        const picked = chosen === choice.id;
        const pickedWrong = picked && !choice.is_correct;

        return (
          <div
            key={choice.id}
            className={`flex items-center gap-4 rounded-lg border-2 px-4 py-3 text-left text-sm ${
              choice.is_correct
                ? "border-[#0F7B52] bg-[#0F7B52]/10"
                : pickedWrong
                  ? "border-[#C91D1D] bg-[#C91D1D]/10"
                  : "border-border"
            }`}
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                choice.is_correct
                  ? "border-[#0F7B52] bg-[#0F7B52] text-white"
                  : pickedWrong
                    ? "border-[#C91D1D] bg-[#C91D1D] text-white"
                    : "border-border text-muted-foreground"
              }`}
            >
              {String.fromCharCode(65 + choiceIndex)}
            </span>

            <span className="flex-1">{choice.text}</span>

            {choice.is_correct && (
              <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-[#0F7B52]">
                {picked ? "Your answer · Correct" : "Correct answer"}
              </span>
            )}
            {pickedWrong && (
              <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-[#C91D1D]">
                Your answer
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
