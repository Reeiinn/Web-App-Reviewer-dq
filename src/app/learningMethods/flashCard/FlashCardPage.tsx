"use client";

import { AppNav } from "@/components/ui/app-nav";
import { BackLink } from "@/components/ui/back-link";
import { Result } from "@/components/ui/result";
import { motivationFor, MotivationMessage } from "@/lib/helper/motivation";
import { splitStatements } from "@/lib/helper/question-text";
import { createWriteQueue } from "@/lib/helper/session-writes";
import { restoreSession, type SavedSession } from "@/lib/helper/study-session";
import { useFitText, type FitText } from "@/lib/helper/use-fit-text";
import { examLabels, parseExamType, type ExamType } from "@/lib/types/common";
import type {
  Flashcard,
  FlashcardProgressResponse,
} from "@/lib/types/flashcard";
import { Check, ChevronLeft, ChevronRight, Shuffle, X } from "lucide-react";
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

  const frontFit = useFitText<HTMLSpanElement, HTMLSpanElement>(
    card?.front ?? "",
  );
  const backFit = useFitText<HTMLSpanElement, HTMLSpanElement>(
    card?.back ?? "",
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
    // The reviewer is a single screen: the shell owns the viewport height and
    // the card takes whatever is left after the chrome, so the page itself
    // never scrolls on a short or narrow window.
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <AppNav compact />

      <main className="rv-shell flex min-h-0 max-w-3xl flex-1 flex-col py-4 text-center md:py-6">
        <BackLink />
        <div className="flex shrink-0 items-center justify-between">
          <div />
          <button
            onClick={() => {
              setCards((current) => shuffled(current));
              setIndex(0);
              setRevealed(false);
              setResumedAt(null);
            }}
            className="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-border px-3 py-2 text-xs font-bold transition hover:border-[#C9A227]"
          >
            <Shuffle className="size-3.5" /> Shuffle
          </button>
        </div>

        {/* The heading block is the first thing to give up room on a short
            window, so it steps down instead of pushing the card off-screen. */}
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl md:text-4xl [@media(max-height:700px)]:mt-2 [@media(max-height:700px)]:text-lg [@media(min-height:900px)]:text-5xl">
          {trackTitles[type]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground [@media(max-height:700px)]:hidden">
          Master core concepts with active recall.
        </p>

        {/* Says where the deck picked up, so a resumed session never looks like
            a restarted one. */}
        {resumedAt === index && (
          <p className="rv-pop-in mx-auto mt-3 w-fit shrink-0 rounded-lg border border-[#C9A227] bg-[#FFF8D6] px-4 py-1.5 text-xs font-bold text-[#0B2340]">
            Resumed at card {index + 1} of {cards.length}
          </p>
        )}

        <div className="relative mt-4 flex min-h-0 flex-1">
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

          <button
            type="button"
            aria-label={revealed ? "Show question" : "Reveal answer"}
            onClick={() => setRevealed((current) => !current)}
            className="flex min-h-0 w-full flex-1 [perspective:1200px]"
          >
            {/* The frame fills the room the viewport leaves after the chrome;
                the text inside scales itself down to fit, and scrolls only if
                it hits the floor. */}
            <span
              className={`relative grid h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
                revealed ? "[transform:rotateY(180deg)]" : ""
              }`}
            >
              <span className="rv-card col-start-1 row-start-1 flex h-full flex-col items-center justify-center gap-3 overflow-hidden p-4 [backface-visibility:hidden] sm:gap-4 sm:p-8">
                {/* A glyph rather than an icon: lucide encloses every question
                    mark it has, and the bare mark matches the bare check. */}
                <span
                  aria-hidden="true"
                  className="block shrink-0 text-3xl font-extrabold leading-none text-[#C9A227] [@media(max-height:700px)]:hidden"
                >
                  ?
                </span>

                <FitBox fit={frontFit}>
                  {front.prompt && (
                    <span className="block text-[1.5em] font-extrabold leading-[1.35]">
                      {front.prompt}
                    </span>
                  )}

                  {/* Enumerated statements read as a list, not as one paragraph
                      run together with the question. */}
                  {front.statements.length > 0 && (
                    <span className="flex w-full flex-col gap-[0.6em] text-left">
                      {front.statements.map((statement) => (
                        <span
                          key={statement}
                          className="block rounded-lg bg-muted px-[0.9em] py-[0.65em] text-[1.125em] font-semibold leading-[1.5]"
                        >
                          {statement}
                        </span>
                      ))}
                    </span>
                  )}
                </FitBox>

                <span className="block shrink-0 text-xs font-semibold text-muted-foreground [@media(max-height:700px)]:hidden">
                  Tap to reveal answer
                </span>
              </span>

              <span className="col-start-1 row-start-1 flex h-full flex-col items-center justify-center gap-3 overflow-hidden rounded-xl bg-[#0B2340] p-4 text-white [backface-visibility:hidden] sm:gap-4 [transform:rotateY(180deg)] sm:p-8">
                <FitBox fit={backFit}>
                  {back.prompt && (
                    <span className="flex flex-col items-center gap-1">
                      <span className="text-[0.6em] font-semibold text-white/70">
                        Answer:
                      </span>
                      <span className="block text-[1.5em] font-bold leading-[1.35]">
                        {back.prompt}
                      </span>
                    </span>
                  )}

                  {back.statements.length > 0 && (
                    <span className="flex w-full flex-col gap-[0.6em] text-left">
                      {back.statements.map((statement) => (
                        <span
                          key={statement}
                          className="block rounded-lg bg-white/12 px-[0.9em] py-[0.65em] text-[1.25em] font-semibold leading-[1.5]"
                        >
                          {statement}
                        </span>
                      ))}
                    </span>
                  )}
                </FitBox>
              </span>
            </span>
          </button>
        </div>

        <div className="mt-4 flex shrink-0 items-center justify-center gap-8">
          <button
            aria-label="Still learning"
            onClick={() => answer(false)}
            disabled={!revealed || Boolean(message)}
            className="flex size-14 items-center justify-center rounded-full border-2 border-rose-400 [@media(max-height:700px)]:size-11 text-rose-500 transition hover:bg-rose-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
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
            className="flex size-14 items-center justify-center rounded-full border-2 border-[#C9A227] [@media(max-height:700px)]:size-11 text-[#8A6D0B] transition hover:bg-[#FFD400] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Check className="size-6" />
          </button>
        </div>

        {/* Step through the deck without rating a card either way. */}
        <div className="mt-3 flex shrink-0 items-center justify-center gap-3">
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
        className="flex w-full flex-col items-center gap-[0.9em]"
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
