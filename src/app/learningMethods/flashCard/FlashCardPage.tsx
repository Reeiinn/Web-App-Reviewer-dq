"use client";

import { AppNav } from "@/components/ui/app-nav";
import { BackLink } from "@/components/ui/back-link";
import {
  AnswerFeedback,
  Confetti,
  StreakBadge,
} from "@/components/ui/motivation";
import { Result } from "@/components/ui/result";
import { motivationFor, MotivationMessage } from "@/lib/helper/motivation";
import { splitStatements } from "@/lib/helper/question-text";
import { restoreSession, type SavedSession } from "@/lib/helper/study-session";
import { useFitText, type FitText } from "@/lib/helper/use-fit-text";
import { examLabels, type ExamType } from "@/lib/types/common";
import type {
  Flashcard,
  FlashcardProgressResponse,
} from "@/lib/types/flashcard";
import type { StreakRow } from "@/lib/types/streak";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Shuffle,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

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
};

function FlashCardContent() {
  const searchParams = useSearchParams();
  const type: ExamType =
    searchParams.get("exam_type") === "TRADITIONAL_LIFE"
      ? "TRADITIONAL_LIFE"
      : "VUL";

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [ratings, setRatings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

  const [streak, setStreak] = useState({ current: 0, best: 0 });
  const [message, setMessage] = useState<MotivationMessage | null>(null);
  const [celebration, setCelebration] = useState(0);
  const advanceTimer = useRef<number | null>(null);
  /** Card the deck resumed on, so the learner sees where they left off. */
  const [resumedAt, setResumedAt] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch(`/api/flashcards?exam_type=${encodeURIComponent(type)}`).then(
        (response) => response.json() as Promise<Flashcard[]>,
      ),
      fetch("/api/streaks")
        .then((response) => response.json() as Promise<StreakRow[]>)
        .catch((): StreakRow[] => []),
      fetch(sessionUrl(type))
        .then((response) => response.json() as Promise<unknown>)
        .catch((): unknown => null),
    ])
      .then(([items, streaks, saved]) => {
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

        const mine = Array.isArray(streaks)
          ? streaks.find((row) => row.exam_type === type)
          : null;
        if (mine) {
          setStreak({ current: mine.current_streak, best: mine.best_streak });
        }
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

    fetch(sessionUrl(type), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        card_order: cards.map((item) => item.id),
        card_index: index,
        ratings,
      }),
    }).catch((error) => {
      console.error("Failed to save flashcard session:", error);
    });
  }, [cards, index, ratings, loading, finished, type]);

  // A finished deck has nothing to resume into: the next visit starts over.
  useEffect(() => {
    if (!finished) return;

    fetch(sessionUrl(type), { method: "DELETE" }).catch((error) => {
      console.error("Failed to clear flashcard session:", error);
    });
  }, [finished, type]);

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

    const optimistic = isCorrect ? streak.current + 1 : 0;
    setStreak((current) => ({
      current: optimistic,
      best: Math.max(current.best, optimistic),
    }));
    setMessage(motivationFor(isCorrect, optimistic, index));
    if (isCorrect) setCelebration((run) => run + 1);

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
      const data = (await response.json()) as Partial<FlashcardProgressResponse>;
      if (data.streak) {
        setStreak({ current: data.streak.current, best: data.streak.best });
      }
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
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />

      <main className="rv-shell max-w-3xl py-10 text-center">
        <BackLink />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-left">
            <StreakBadge
              current={streak.current}
              best={streak.best}
              pulse={message?.mood === "correct"}
            />
          </div>
          <button
            onClick={() => {
              setCards((current) => shuffled(current));
              setIndex(0);
              setRevealed(false);
              setResumedAt(null);
            }}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold transition hover:border-[#C9A227]"
          >
            <Shuffle className="size-3.5" /> Shuffle
          </button>
        </div>

        <h1 className="mt-6 text-4xl font-extrabold md:text-5xl">
          {trackTitles[type]}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Master core concepts with active recall.
        </p>

        {/* Says where the deck picked up, so a resumed session never looks like
            a restarted one. */}
        {resumedAt === index && (
          <p className="rv-pop-in mx-auto mt-4 w-fit rounded-lg border border-[#C9A227] bg-[#FFF8D6] px-4 py-2 text-sm font-bold text-[#0B2340]">
            Resumed at card {index + 1} of {cards.length}
          </p>
        )}

        <div className="relative mt-8">
          <Confetti
            active={message?.mood === "correct"}
            runId={celebration}
            pieces={message?.milestone ? 34 : 20}
          />

          <button
            type="button"
            aria-label={revealed ? "Show question" : "Reveal answer"}
            onClick={() => setRevealed((current) => !current)}
            className="w-full [perspective:1200px]"
          >
            {/* The frame is a fixed height on every card; the text inside
                scales itself down to fit, and scrolls if it hits the floor. */}
            <span
              className={`relative grid h-[24rem] transition-transform duration-500 [transform-style:preserve-3d] sm:h-[28rem] ${
                revealed ? "[transform:rotateY(180deg)]" : ""
              }`}
            >
              <span className="rv-card col-start-1 row-start-1 flex h-full flex-col items-center justify-center gap-4 overflow-hidden p-6 [backface-visibility:hidden] sm:p-10">
                <HelpCircle className="size-7 shrink-0 text-[#C9A227]" />

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

                <span className="block shrink-0 text-xs font-semibold text-muted-foreground">
                  Tap to reveal answer
                </span>
              </span>

              <span className="col-start-1 row-start-1 flex h-full flex-col items-center justify-center gap-4 overflow-hidden rounded-xl bg-[#FFD400] p-6 text-[#0B2340] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-10">
                <FitBox fit={backFit}>
                  {back.prompt && (
                    <span className="block text-[1.5em] font-bold leading-[1.35]">
                      {back.prompt}
                    </span>
                  )}

                  {back.statements.length > 0 && (
                    <span className="flex w-full flex-col gap-[0.6em] text-left">
                      {back.statements.map((statement) => (
                        <span
                          key={statement}
                          className="block rounded-lg bg-[#0B2340]/10 px-[0.9em] py-[0.65em] text-[1.25em] font-semibold leading-[1.5]"
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

        <div className="mt-8 flex items-center justify-center gap-8">
          <button
            aria-label="Still learning"
            onClick={() => answer(false)}
            disabled={!revealed || Boolean(message)}
            className="flex size-14 items-center justify-center rounded-full border-2 border-rose-400 text-rose-500 transition hover:bg-rose-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
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
            className="flex size-14 items-center justify-center rounded-full border-2 border-[#C9A227] text-[#8A6D0B] transition hover:bg-[#FFD400] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Check className="size-6" />
          </button>
        </div>

        {/* Step through the deck without rating a card either way. */}
        <div className="mt-6 flex items-center justify-center gap-3">
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

        {message && (
          <div className="mx-auto mt-6 max-w-md text-left">
            <AnswerFeedback message={message} />
          </div>
        )}
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
