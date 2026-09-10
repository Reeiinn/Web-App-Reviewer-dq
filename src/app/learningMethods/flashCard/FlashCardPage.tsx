"use client";

import { AppNav } from "@/components/ui/app-nav";
import { BackLink } from "@/components/ui/back-link";
import { Result } from "@/components/ui/result";
import { motivationFor, MotivationMessage } from "@/lib/helper/motivation";
import {
  labelChoices,
  matchChoice,
  splitStatements,
  statementsNamed,
} from "@/lib/helper/question-text";
import { createWriteQueue } from "@/lib/helper/session-writes";
import {
  restoreSession,
  shuffleUnstudied,
  type SavedSession,
} from "@/lib/helper/study-session";
import { useFitText, type FitText } from "@/lib/helper/use-fit-text";
import { examLabels, parseExamType, type ExamType } from "@/lib/types/common";
import type {
  Flashcard,
  FlashcardProgressResponse,
} from "@/lib/types/flashcard";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Shuffle,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { fresh } from "@/lib/helper/fetch-fresh";

const shuffled = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

const sessionUrl = (type: ExamType) =>
  `/api/flashcards/session?exam_type=${encodeURIComponent(type)}`;

/** A body that is not a saved deck position (an error payload, say) resumes nothing. */
const asSavedSession = (value: unknown): SavedSession | null =>
  value &&
  typeof value === "object" &&
  Array.isArray((value as SavedSession).card_order)
    ? (value as SavedSession)
    : null;

const trackTitles: Record<ExamType, string> = {
  VUL: "VUL Track Review",
  TRADITIONAL_LIFE: "Traditional Life Review",
  IIAP_A: "IIAP Set A Review",
  IIAP_B: "IIAP Set B Review",
};

function FlashCardContent() {
  const searchParams = useSearchParams();
  const type = parseExamType(searchParams.get("exam_type"));

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [ratings, setRatings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

  /** Correct answers in a row this sitting, for the milestone celebrations.
      Nothing persists it: it is a in-session run, not a streak record. */
  const [run, setRun] = useState(0);
  const [message, setMessage] = useState<MotivationMessage | null>(null);
  const advanceTimer = useRef<number | null>(null);
  /** Card the deck resumed on, so the learner sees where they left off. */
  const [resumedAt, setResumedAt] = useState<number | null>(null);

  /** Saves and clearings of the deck, in the order this page issued them. */
  const writeQueue = useRef(
    createWriteQueue((error) =>
      console.error("Failed to write flashcard session:", error),
    ),
  );
  const write = useCallback(
    (request: () => Promise<unknown>) => writeQueue.current(request),
    [],
  );

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch(
        `/api/flashcards?exam_type=${encodeURIComponent(type)}`,
        fresh,
      ).then((response) => response.json() as Promise<Flashcard[]>),
      fetch(sessionUrl(type), fresh)
        .then((response) => response.json() as Promise<unknown>)
        .catch((): unknown => null),
    ])
      .then(([items, saved]) => {
        if (!active) return;

        const deck = Array.isArray(items) ? items : [];
        const byId = new Map(deck.map((item) => [item.id, item]));

        // Deal the deck in the saved order and pick up on the saved card, so a
        // half-finished session continues at "Card 5 of 20" instead of card 1.
        const session = restoreSession(
          deck.map((item) => item.id),
          asSavedSession(saved),
        );

        setCards(
          session.order
            .map((id) => byId.get(id))
            .filter((item): item is Flashcard => Boolean(item)),
        );
        setIndex(session.index);
        setRevealed(false);
        setRatings(session.ratings);
        setFinished(false);
        setResumedAt(session.resumed ? session.index : null);
      })
      .catch(() => active && setCards([]))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [type]);

  // Every position change is written through, so the deck resumes on whatever
  // device the learner opens next. A failed save only costs the resume point.
  useEffect(() => {
    if (loading || finished || cards.length === 0) return;

    write(() =>
      fetch(sessionUrl(type), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_order: cards.map((item) => item.id),
          card_index: index,
          ratings,
        }),
      }),
    );
  }, [cards, index, ratings, loading, finished, type, write]);

  // A finished deck has nothing to resume into: the next visit starts over.
  // Queued behind the saves rather than raced against them, so a redo deck
  // dealt straight after this clearing outlives it.
  useEffect(() => {
    if (!finished) return;

    write(() => fetch(sessionUrl(type), { method: "DELETE" }));
  }, [finished, type, write]);

  // The resume note is an orientation cue, not a permanent label: it says where
  // the deck picked up and then gives its room back to the card.
  useEffect(() => {
    if (resumedAt === null) return;

    const timer = window.setTimeout(() => setResumedAt(null), 3000);
    return () => window.clearTimeout(timer);
  }, [resumedAt]);

  useEffect(
    () => () => {
      if (advanceTimer.current !== null) {
        window.clearTimeout(advanceTimer.current);
      }
    },
    [],
  );

  const card = cards[index];
  const wrong = cards.filter((item) => ratings[item.id] === false);
  const front = splitStatements(card?.front ?? "");
  const back = splitStatements(card?.back ?? "");
  const choices = labelChoices(card?.choices);
  /** The option the answer names, so the back can carry its letter. */
  const answerChoice = matchChoice(choices, card?.back ?? "");
  const namedStatements = statementsNamed(
    front.statements,
    answerChoice?.text ?? card?.back ?? "",
  );

  // Keyed on the card rather than on its text: the frame is remounted per card,
  // so two cards that happen to read the same still need a fresh measurement of
  // the nodes now on screen.
  const frontFit = useFitText<HTMLSpanElement, HTMLSpanElement>(
    `${card?.id ?? ""}:front`,
  );
  const backFit = useFitText<HTMLSpanElement, HTMLSpanElement>(
    `${card?.id ?? ""}:back`,
  );

  /** Step between cards without rating the current one. */
  const move = (step: number) => {
    if (message) return;
    const next = index + step;
    if (next < 0 || next > cards.length - 1) return;
    setIndex(next);
    setRevealed(false);
  };

  const resetSession = (nextCards: Flashcard[]) => {
    setCards(nextCards);
    setIndex(0);
    setRevealed(false);
    setRatings({});
    setFinished(false);
    setMessage(null);
    setResumedAt(null);
  };

  const answer = async (isCorrect: boolean) => {
    if (!card || !revealed || message) return;

    setRatings((current) => ({ ...current, [card.id]: isCorrect }));

    const nextRun = isCorrect ? run + 1 : 0;
    setRun(nextRun);
    setMessage(motivationFor(isCorrect, nextRun, index));

    advanceTimer.current = window.setTimeout(() => {
      setMessage(null);
      if (index === cards.length - 1) setFinished(true);
      else {
        setIndex((current) => current + 1);
        setRevealed(false);
      }
    }, 1200);

    try {
      const response = await fetch(`/api/flashcards/${card.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mastered: isCorrect }),
      });
      await response.json();
    } catch (error) {
      console.error("Failed to save flashcard progress:", error);
    }
  };

  if (loading) {
    return <Shell type={type}>Loading flashcards…</Shell>;
  }

  if (finished) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppNav />
        <main className="rv-shell max-w-2xl py-10">
          <BackLink />
          <Result
            correct={cards.length - wrong.length}
            wrong={wrong.length}
            onTryAgain={() => resetSession(shuffled(cards))}
            onRedoMistakes={
              wrong.length ? () => resetSession(shuffled(wrong)) : undefined
            }
          />
        </main>
      </div>
    );
  }

  if (!card) {
    return (
      <Shell type={type}>
        No flashcards are available for this track right now.
      </Shell>
    );
  }

  return (
    // The reviewer is one screen: the shell owns the viewport height and the
    // card takes everything the chrome does not need, so the page itself never
    // scrolls. The chrome is two short rows to keep that share large.
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <AppNav compact />

      <main className="rv-shell flex min-h-0 max-w-3xl flex-1 flex-col py-3 text-center md:py-4">
        {/* The title rides the back link's row rather than taking a band of
            its own: on a laptop that band was the difference between a card
            that fits its question and one that scrolls. */}
        <div className="relative flex shrink-0 items-center justify-center">
          <BackLink className="absolute left-0" />
          <h1 className="text-lg font-extrabold sm:text-xl md:text-2xl">
            {trackTitles[type]}
          </h1>
        </div>

        {/* Two separate jobs, kept at opposite ends of the row so the one that
            throws away the sitting is never a thumb-slip from the one that
            keeps it. */}
        <div className="relative mt-2 flex shrink-0 items-center justify-between">
          {/* Says where the deck picked up, so a resumed session never looks
              like a restarted one. It sits in the gap this row already has
              between its two buttons: a note that lasts three seconds must not
              cost the card a band of height for the whole sitting. */}
          {resumedAt === index && (
            <p className="rv-pop-in pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-[#C9A227] bg-[#FFF8D6] px-3 py-1 text-xs font-bold text-[#0B2340]">
              Resumed at card {index + 1} of {cards.length}
            </p>
          )}

          <button
            onClick={() => resetSession(shuffled(cards))}
            disabled={Boolean(message)}
            className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-border px-3 py-2 text-xs font-bold transition hover:border-[#C9A227] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="size-3.5" /> Reset
          </button>

          <button
            onClick={() => {
              // Only the cards still to be rated are re-dealt, and the position
              // holds. Shuffling used to deal the whole deck from the top,
              // which walked the learner back over cards they had already
              // cleared — the reason to shuffle mid-deck is the material that
              // is left, not the material that is done.
              setCards((current) => shuffleUnstudied(current, ratings));
              setRevealed(false);
            }}
            disabled={Boolean(message)}
            className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-border px-3 py-2 text-xs font-bold transition hover:border-[#C9A227] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Shuffle className="size-3.5" /> Shuffle
          </button>
        </div>

        {/* The card starts right below the Reset row and takes the rest. The
            resume note floats over its top corner rather than pushing it down:
            a note that lasts three seconds must not cost the card a band of
            height for the whole sitting. */}
        <div className="relative mt-2 flex min-h-0 flex-1">
          {/* The verdict takes the whole card face rather than floating in a
              strip over it, so the colour alone reads as the answer from across
              the room and the words carry the rest. */}
          {message && (
            <div
              role="status"
              className={`rv-pop-in pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 rounded-[var(--radius)] p-8 text-center text-white ${
                message.mood === "correct" ? "bg-[#0F7B52]" : "bg-[#C91D1D]"
              }`}
            >
              <p className="text-3xl font-extrabold leading-tight sm:text-4xl">
                {message.headline}
              </p>
              {message.mood === "correct" ? (
                <Check className="size-14" strokeWidth={3} />
              ) : (
                <X className="size-14" strokeWidth={3} />
              )}
            </div>
          )}

          {/* The verdict above is pointer-events-none so it never swallows a
              click meant for the card. That let a click land on the card while
              the verdict was still up, flipping it behind the overlay — so the
              card itself stands down until the verdict clears, the same guard
              the rating and step controls already use. */}
          <button
            type="button"
            aria-label={revealed ? "Show question" : "Reveal answer"}
            onClick={() => setRevealed((current) => !current)}
            disabled={Boolean(message)}
            className="flex min-h-0 w-full flex-1 [perspective:1200px]"
          >
            {/* The frame fills the room the viewport leaves after the chrome;
                the text inside scales itself down to fit, and scrolls only if
                it hits the floor. */}
            {/* Keyed on the card, so moving to the next one mounts a fresh
                frame that is already face up. Turning the same element back
                instead animated it through 90 degrees, and the back face —
                carrying the next card's answer by then — showed for that half
                of the turn. A flip is only ever the learner revealing the card
                in front of them. */}
            <span
              key={card.id}
              className={`relative grid h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
                revealed ? "[transform:rotateY(180deg)]" : ""
              }`}
            >
              <span className="rv-card col-start-1 row-start-1 flex h-full flex-col items-center justify-center gap-2 overflow-hidden p-3 [backface-visibility:hidden] sm:gap-3 sm:p-5 [@media(max-height:700px)]:gap-1.5 [@media(max-height:700px)]:p-2">
                <FitBox fit={frontFit}>
                  {front.prompt && (
                    <span className="block text-[1.5em] font-extrabold leading-[1.35]">
                      {front.prompt}
                    </span>
                  )}

                  {/* Enumerated statements read as a list, not as one paragraph
                      run together with the question. */}
                  {front.statements.length > 0 && (
                    <span className="flex w-full flex-col gap-[0.3em] text-left">
                      {front.statements.map((statement) => (
                        <span
                          key={statement}
                          className="block rounded-lg bg-muted px-[0.7em] py-[0.35em] text-[1.125em] font-semibold leading-[1.3]"
                        >
                          {statement}
                        </span>
                      ))}
                    </span>
                  )}

                  {/* "Which of the following" cannot be answered from the
                      prompt alone, so the options are on the question side
                      rather than the answer side. They carry the card's own
                      surface and a border instead of the statements' filled
                      chip: on a card that enumerates statements too, the rows
                      you choose between must not look like the rows you are
                      being told. */}
                  {choices.length > 0 && (
                    <span className="flex w-full flex-col gap-[0.3em] text-left">
                      {choices.map((choice) => (
                        <span
                          key={choice.id}
                          className="flex items-start gap-[0.6em] rounded-lg border border-border bg-card px-[0.7em] py-[0.35em] text-[1.125em] font-semibold leading-[1.3]"
                        >
                          <span className="shrink-0 font-extrabold text-[#0B2340]/70">
                            {choice.letter}.
                          </span>
                          <span>{choice.text}</span>
                        </span>
                      ))}
                    </span>
                  )}
                </FitBox>

                <span className="block shrink-0 text-xs font-semibold text-muted-foreground [@media(max-height:700px)]:hidden">
                  Tap to reveal answer
                </span>
              </span>

              <span className="col-start-1 row-start-1 flex h-full flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#0B2340] p-3 text-white [backface-visibility:hidden] sm:gap-3 [transform:rotateY(180deg)] sm:p-5 [@media(max-height:700px)]:gap-1.5 [@media(max-height:700px)]:p-2">
                <FitBox fit={backFit}>
                  {(back.prompt || answerChoice) && (
                    <span className="flex w-full flex-col items-center gap-1">
                      <span className="text-[0.6em] font-semibold text-white/70">
                        Answer:
                      </span>
                      {/* The letter and the words together: a letter alone
                          cannot be checked against the front once the card has
                          turned, and the words alone leave the learner to
                          count the options back. */}
                      <span className="flex items-start justify-center gap-[0.4em] text-[1.5em] font-bold leading-[1.35]">
                        {answerChoice && (
                          <span className="shrink-0 text-[#FFD400]">
                            {answerChoice.letter}.
                          </span>
                        )}
                        <span>{back.prompt}</span>
                      </span>
                    </span>
                  )}

                  {/* Statements the answer names by numeral, spelled out, then
                      any the answer itself enumerated. */}
                  {(namedStatements.length > 0 ||
                    back.statements.length > 0) && (
                    <span className="flex w-full flex-col gap-[0.3em] text-left">
                      {[...namedStatements, ...back.statements].map(
                        (statement) => (
                          <span
                            key={statement}
                            className="block rounded-lg bg-white/12 px-[0.7em] py-[0.35em] text-[1.125em] font-semibold leading-[1.3]"
                          >
                            {statement}
                          </span>
                        ),
                      )}
                    </span>
                  )}
                </FitBox>
              </span>
            </span>
          </button>
        </div>

        <div className="mt-3 flex shrink-0 items-center justify-center gap-8 [@media(max-height:700px)]:mt-2">
          <button
            aria-label="Still learning"
            onClick={() => answer(false)}
            disabled={!revealed || Boolean(message)}
            className="flex size-12 items-center justify-center rounded-full border-2 border-rose-400 [@media(max-height:700px)]:size-11 text-rose-500 transition hover:bg-rose-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            <X className="size-6" />
          </button>

          <span className="text-sm font-semibold text-muted-foreground">
            Card {index + 1} of {cards.length}
          </span>

          <button
            aria-label="I know this"
            onClick={() => answer(true)}
            disabled={!revealed || Boolean(message)}
            className="flex size-12 items-center justify-center rounded-full border-2 border-[#C9A227] [@media(max-height:700px)]:size-11 text-[#8A6D0B] transition hover:bg-[#FFD400] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Check className="size-6" />
          </button>
        </div>

        {/* Step through the deck without rating a card either way. */}
        <div className="mt-3 flex shrink-0 items-center justify-center gap-3 [@media(max-height:700px)]:mt-1.5">
          <button
            onClick={() => move(-1)}
            disabled={index === 0 || Boolean(message)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-bold transition hover:border-[#C9A227] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
            Back
          </button>
          <button
            onClick={() => move(1)}
            disabled={index === cards.length - 1 || Boolean(message)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm font-bold transition hover:border-[#C9A227] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight className="size-4" />
          </button>
        </div>
      </main>
    </div>
  );
}

/**
 * Holds one card face's text. The outer span is the measured frame; the inner
 * one carries the fitted base size that every em inside it scales from.
 */
function FitBox({
  fit,
  children,
}: {
  fit: FitText<HTMLSpanElement, HTMLSpanElement>;
  children: React.ReactNode;
}) {
  return (
    <span
      ref={fit.boxRef}
      className="flex min-h-0 w-full flex-1 items-center overflow-y-auto overscroll-contain"
    >
      <span
        ref={fit.contentRef}
        style={{ fontSize: `${fit.fontSize}px` }}
        className="flex w-full flex-col items-center gap-[0.5em]"
      >
        {children}
      </span>
    </span>
  );
}

function Shell({
  type,
  children,
}: {
  type: ExamType;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />
      <main className="rv-shell max-w-3xl py-12 text-center">
        <BackLink />
        <h1 className="text-4xl font-extrabold">{trackTitles[type]}</h1>
        <p className="mt-4 text-sm text-muted-foreground">{children}</p>
        <p className="mt-1 text-xs text-muted-foreground">{examLabels[type]}</p>
      </main>
    </div>
  );
}

export function FlashCardPage() {
  return (
    <Suspense fallback={<Shell type="VUL">Loading flashcards…</Shell>}>
      <FlashCardContent />
    </Suspense>
  );
}
