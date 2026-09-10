import type { LabelledChoice } from "@/lib/helper/question-text";

/**
 * Every size and gap the text on a flashcard uses.
 *
 * The card itself — its frame, padding, flip and controls — is in
 * `FlashCardPage`. Nothing here knows about it. Sizes are ems off the base the
 * auto-fit sizer picks per card, so the whole face scales together and a long
 * card shrinks without any of these ratios changing.
 *
 * Tuning how the text reads is editing this table and nothing else.
 */
export const cardText = {
  /** Between the stacked blocks of a face: prompt, statements, choices. */
  blockGap: "0.8em",
  /** Between the rows of one list. */
  rowGap: "0.35em",

  question: {
    /** The question leads the face, so it is set well clear of the options
        it is asking about — a shade under twice their size. */
    prompt: "1.85em",
    /** Tighter than body leading: at display size the default opens gaps
        between the lines wide enough that a wrapped question reads as three
        separate lines rather than one sentence. */
    promptLeading: "1.15",
    statement: "1em",
    choice: "1em",
  },

  answer: {
    label: "0.6em",
    /** The only gold thing on the back, so it carries the face without
        having to be the biggest thing on it. */
    letter: "1.5em",
    text: "1.15em",
    statement: "1em",
    /** Between the label, the letter and the answer's words. */
    headGap: "0.45em",
    /** Under the answer, before the statements that support it. */
    headPad: "0.35em",
  },
} as const;

/** The blocks of one face, stacked and centred. */
function Face({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{ gap: cardText.blockGap }}
      className="flex w-full flex-col items-center"
    >
      {children}
    </span>
  );
}

/** One face's list of rows — statements, or choices. */
function Rows({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{ gap: cardText.rowGap }}
      className="flex w-full flex-col text-left"
    >
      {children}
    </span>
  );
}

/**
 * The question side: what is being asked, the statements it enumerates, and
 * the options to choose between.
 */
export function QuestionText({
  prompt,
  statements,
  choices,
}: {
  prompt: string;
  statements: string[];
  choices: LabelledChoice[];
}) {
  return (
    <Face>
      {prompt && (
        <span
          style={{
            fontSize: cardText.question.prompt,
            lineHeight: cardText.question.promptLeading,
          }}
          className="block font-extrabold"
        >
          {prompt}
        </span>
      )}

      {/* Enumerated statements read as a list, not as one paragraph run
          together with the question. */}
      {statements.length > 0 && (
        <Rows>
          {statements.map((statement) => (
            <span
              key={statement}
              style={{ fontSize: cardText.question.statement }}
              className="block rounded-lg bg-muted px-[0.7em] py-[0.35em] font-semibold leading-[1.3]"
            >
              {statement}
            </span>
          ))}
        </Rows>
      )}

      {/* "Which of the following" cannot be answered from the prompt alone, so
          the options are on the question side rather than the answer side.
          They carry the card's own surface and a border instead of the
          statements' filled chip: on a card that enumerates statements too,
          the rows you choose between must not look like the rows you are being
          told. */}
      {choices.length > 0 && (
        <Rows>
          {choices.map((choice) => (
            <span
              key={choice.id}
              style={{ fontSize: cardText.question.choice }}
              className="flex items-start gap-[0.6em] rounded-lg border border-border bg-card px-[0.7em] py-[0.35em] font-semibold leading-[1.3]"
            >
              {/* The dot stays here, where it is a list marker separating the
                  option's name from its words. */}
              <span className="shrink-0 font-extrabold text-[#0B2340]/70">
                {choice.letter}.
              </span>
              <span>{choice.text}</span>
            </span>
          ))}
        </Rows>
      )}
    </Face>
  );
}

/**
 * The answer side: which option is right, and the statements that make it so.
 */
export function AnswerText({
  letter,
  prompt,
  statements,
}: {
  letter?: string;
  prompt: string;
  statements: string[];
}) {
  return (
    <Face>
      {(prompt || letter) && (
        <span
          style={{
            gap: cardText.answer.headGap,
            paddingBottom: cardText.answer.headPad,
          }}
          className="flex w-full flex-col items-center"
        >
          <span
            style={{ fontSize: cardText.answer.label }}
            className="font-semibold text-white/70"
          >
            Answer:
          </span>

          {/* The letter and the words both: a letter alone cannot be checked
              against the front once the card has turned, and the words alone
              leave the learner to count the options back.

              The letter takes its own line under the label, so it reads as the
              answer's name at any width rather than as the first word of a
              sentence — and with no trailing dot, since on its own line it is
              naming the answer, not marking a list row. */}
          {letter && (
            <span
              style={{ fontSize: cardText.answer.letter }}
              className="block font-extrabold leading-none text-[#FFD400]"
            >
              {letter}
            </span>
          )}

          <span
            style={{ fontSize: cardText.answer.text }}
            className="block font-bold leading-[1.4]"
          >
            {prompt}
          </span>
        </span>
      )}

      {statements.length > 0 && (
        <Rows>
          {statements.map((statement) => (
            <span
              key={statement}
              style={{ fontSize: cardText.answer.statement }}
              className="block rounded-lg bg-white/12 px-[0.7em] py-[0.35em] font-semibold leading-[1.3]"
            >
              {statement}
            </span>
          ))}
        </Rows>
      )}
    </Face>
  );
}
