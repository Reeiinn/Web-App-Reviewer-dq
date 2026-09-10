"use client";

import { AppNav } from "@/components/ui/app-nav";
import { BackLink } from "@/components/ui/back-link";
import { Confetti, SessionMastery } from "@/components/ui/motivation";
import { Result } from "@/components/ui/result";
import { motivationFor, type MotivationMessage } from "@/lib/helper/motivation";
import { splitStatements } from "@/lib/helper/question-text";
import { restoreMemorization } from "@/lib/helper/memorization-session";
import { createWriteQueue } from "@/lib/helper/session-writes";
import type { SavedSession } from "@/lib/helper/study-session";
import { useFitText } from "@/lib/helper/use-fit-text";
import { examLabels, parseExamType, type ExamType } from "@/lib/types/common";
import type {
  MemorizationProgressResponse,
  MemorizationQuestion,
} from "@/lib/types/memo";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, X } from "lucide-react";
import { fresh } from "@/lib/helper/fetch-fresh";

const shuffled = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

const sessionUrl = (type: ExamType) =>
  `/api/memorization/session?exam_type=${encodeURIComponent(type)}`;

/** A body that is not a saved position (an error payload, say) resumes nothing. */
const asSavedSession = (value: unknown): SavedSession | null =>
  value &&
  typeof value === "object" &&
  Array.isArray((value as SavedSession).card_order)
    ? (value as SavedSession)
    : null;

function MemorizationContent() {
  const searchParams = useSearchParams();
  const type = parseExamType(searchParams.get("exam_type"));

  const [questions, setQuestions] = useState<MemorizationQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

  /** Every answer so far, and the one thing this sitting saves and resumes. */
  const [ratings, setRatings] = useState<Record<string, boolean>>({});
  /** Mastery for the whole track: what the practice exam is gated on. */
  const [trackMastery, setTrackMastery] = useState<{
    mastered: number;
    total: number;
  } | null>(null);
  /** Question the sitting picked up on, so a resume never looks like a restart. */
  const [resumedAt, setResumedAt] = useState<number | null>(null);

  /** Correct answers in a row this sitting, for the milestone celebrations.
      Nothing persists it: it is an in-session run, not a streak record. */
  const [run, setRun] = useState(0);
  const [message, setMessage] = useState<MotivationMessage | null>(null);
  /** The flashcard-style verdict over the card: shown on an answer given here,
      never on a resumed one, and gone again after a beat. */
  const [verdict, setVerdict] = useState<MotivationMessage | null>(null);
  const [celebration, setCelebration] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  /** Answers timed in this sitting: a resumed one has no clock for the rest. */
  const [timedCount, setTimedCount] = useState(0);

  const questionShownAt = useRef<number>(Date.now());
  const verdictTimer = useRef<number | null>(null);

  /** Saves and clearings of the sitting, in the order this page issued them. */
  const writeQueue = useRef(
    createWriteQueue((error) =>
      console.error("Failed to write memorization session:", error),
    ),
  );
  const write = useCallback(
    (request: () => Promise<unknown>) => writeQueue.current(request),
    [],
  );

  /** Drops the verdict over the card, then lifts it a beat later. */
  const flashVerdict = (next: MotivationMessage) => {
    if (verdictTimer.current !== null) {
      window.clearTimeout(verdictTimer.current);
    }
    setVerdict(next);
    verdictTimer.current = window.setTimeout(() => {
      verdictTimer.current = null;
      setVerdict(null);
    }, 1200);
  };

  const clearVerdict = () => {
    if (verdictTimer.current !== null) {
      window.clearTimeout(verdictTimer.current);
      verdictTimer.current = null;
    }
    setVerdict(null);
  };

  useEffect(
    () => () => {
      if (verdictTimer.current !== null) {
        window.clearTimeout(verdictTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch(
        `/api/memorization?exam_type=${encodeURIComponent(type)}`,
        fresh,
      ).then((response) => response.json() as Promise<MemorizationQuestion[]>),
      fetch(sessionUrl(type), fresh)
        .then((response) => response.json() as Promise<unknown>)
        .catch((): unknown => null),
    ])
      .then(([items, saved]) => {
        if (!active) return;

        // Pick the sitting up where it stopped: same order, same question,
        // same score. A visit with nothing saved deals a fresh shuffle.
        const session = restoreMemorization(
          Array.isArray(items) ? items : [],
          asSavedSession(saved),
        );

        // A question answered before the learner left comes back answered:
        // their choice locked in, the result shown, Next waiting. Only an
        // unanswered one is dealt fresh. Without the saved choice there is
        // nothing to redraw, so that question asks itself again.
        const stoppedOn = session.questions[session.index];
        const answer = stoppedOn ? session.ratings[stoppedOn.id] : undefined;
        const answeredChoiceId =
          answer === undefined ? null : (stoppedOn?.answered_choice_id ?? null);

        setQuestions(session.questions);
        setIndex(session.index);
        setRatings(session.ratings);
        setResumedAt(session.resumed ? session.index : null);
        setSelected(answeredChoiceId);
        setChecked(answeredChoiceId !== null);
        setMessage(
          answeredChoiceId !== null && answer !== undefined
            ? motivationFor(answer, 0, session.index)
            : null,
        );
        setFinished(false);
        questionShownAt.current = Date.now();
      })
      .catch(() => active && setQuestions([]))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [type]);

  // Every position change is written through, so the sitting resumes on
  // whatever device the learner opens next. A failed save costs the resume
  // point and nothing else.
  useEffect(() => {
    if (loading || finished || questions.length === 0) return;

    write(() =>
      fetch(sessionUrl(type), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_order: questions.map((item) => item.id),
          card_index: index,
          ratings,
        }),
      }),
    );
  }, [questions, index, ratings, loading, finished, type, write]);

  // A finished set has nothing to resume into: the next visit starts over.
  // Queued behind the saves rather than raced against them, so the redo deck
  // this clearing is followed by outlives it.
  useEffect(() => {
    if (!finished) return;

    write(() => fetch(sessionUrl(type), { method: "DELETE" }));
  }, [finished, type, write]);

  const question = questions[index];
  const correctChoiceId = question?.choices.find(
    (choice) => choice.is_correct,
  )?.id;
  const parts = question ? splitStatements(question.text) : null;

  // Refits when the question changes, and again when the window resizes, so
  // the card never needs a scrollbar of its own.
  const fit = useFitText<HTMLDivElement, HTMLDivElement>(
    `${question?.id ?? ""}:${question?.choices.length ?? 0}`,
  );

  // The saved ratings are the score: counting them keeps the tallies and the
  // resume point from ever disagreeing.
  const answers = Object.values(ratings);
  const answeredCount = answers.length;
  const correctCount = answers.filter(Boolean).length;
  const wrong = questions.filter((item) => ratings[item.id] === false);

  const accuracy = answeredCount
    ? Math.round((correctCount / answeredCount) * 100)
    : 0;
  const averageSeconds = timedCount
    ? Math.round(elapsedMs / timedCount / 1000)
    : 0;

  /**
   * Re-reads the track's mastery count.
   *
   * Called on load and after every answer, so the panel agrees with the
   * dashboard the learner just came from rather than with the sitting.
   */
  const refreshTrackMastery = useCallback(() => {
    fetch(
      `/api/memorization/eligibility?exam_type=${encodeURIComponent(type)}`,
      fresh,
    )
      .then((response) => response.json())
      .then((data: { mastered?: number; total?: number }) => {
        if (
          typeof data?.mastered === "number" &&
          typeof data?.total === "number"
        ) {
          setTrackMastery({ mastered: data.mastered, total: data.total });
        }
      })
      .catch((error) =>
        console.error("Failed to load memorization mastery:", error),
      );
  }, [type]);

  useEffect(() => {
    refreshTrackMastery();
  }, [refreshTrackMastery]);

  // The resume note is an orientation cue, not a permanent label: it says where
  // the sitting picked up and then gives its room back to the question.
  useEffect(() => {
    if (resumedAt === null) return;

    const timer = window.setTimeout(() => setResumedAt(null), 3000);
    return () => window.clearTimeout(timer);
  }, [resumedAt]);

  const resetSession = (nextQuestions: MemorizationQuestion[]) => {
    setQuestions(nextQuestions);
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setFinished(false);
    setMessage(null);
    clearVerdict();
    setRatings({});
    setResumedAt(null);
    setElapsedMs(0);
    setTimedCount(0);
    questionShownAt.current = Date.now();
  };

  const submit = async () => {
    if (!question || !selected || checked || !correctChoiceId) return;

    const isCorrect = selected === correctChoiceId;
    setChecked(true);
    setRatings((current) => ({ ...current, [question.id]: isCorrect }));
    setElapsedMs((total) => total + (Date.now() - questionShownAt.current));
    setTimedCount((count) => count + 1);

    const nextRun = isCorrect ? run + 1 : 0;
    setRun(nextRun);
    const verdictNow = motivationFor(isCorrect, nextRun, index);
    setMessage(verdictNow);
    flashVerdict(verdictNow);
    if (isCorrect) setCelebration((run) => run + 1);

    try {
      const response = await fetch(
        `/api/memorization/${question.id}/progress`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selected_choice_id: selected,
            is_correct: isCorrect,
            mastered: isCorrect,
          }),
        },
      );

      await response.json();
      // The answer may have just taken the track's count up, and this panel is
      // the only place the learner can see that while they are still in here.
      refreshTrackMastery();
    } catch (error) {
      console.error("Failed to save memorization progress:", error);
    }
  };

  const advance = () => {
    setMessage(null);
    clearVerdict();
    questionShownAt.current = Date.now();

    if (index === questions.length - 1) {
      setFinished(true);
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setChecked(false);
  };

  const skip = () => {
    if (checked) return;
    setSelected(null);
    advance();
  };

  if (loading) {
    return <Shell type={type}>Loading questions…</Shell>;
  }

  if (finished) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppNav />
        <main className="rv-shell max-w-2xl py-10">
          <BackLink />
          <Result
            correct={questions.length - wrong.length}
            wrong={wrong.length}
            onTryAgain={() => resetSession(shuffled(questions))}
            onRedoMistakes={
              wrong.length ? () => resetSession(shuffled(wrong)) : undefined
            }
          />
        </main>
      </div>
    );
  }

  if (!question) {
    return (
      <Shell type={type}>
        No questions are available for this track right now.
      </Shell>
    );
  }

  const progressPct = ((index + (checked ? 1 : 0)) / questions.length) * 100;

  // Very short choices ("I and II") pair up on a wide card: half the rows is
  // half the height the fit has to swallow, so the question reads a size or
  // two larger. Anything longer keeps the full width and stays on one line.
  const pairChoices =
    question.choices.length >= 4 &&
    question.choices.every((choice) => choice.text.length <= 24);

  return (
    // The reviewer is a single screen: the shell owns the viewport height and
    // the question column takes whatever the chrome leaves, so the page itself
    // never scrolls on a short or narrow window.
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <AppNav compact />

      <main className="rv-shell flex min-h-0 flex-1 flex-col py-4 md:py-6">
        {/* Way out, track and position ride on one line: every row of chrome
            here is a row the question cannot use. */}
        {/* One line at every width: the label and counters never wrap, and the
            title is the only thing wide enough to be worth dropping. */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <BackLink className="[@media(max-height:800px)]:min-h-9" />
          <span className="shrink-0 whitespace-nowrap rounded-full bg-[#FFD400] px-2.5 py-1 text-[11px] font-bold text-[#0B2340] sm:px-3 sm:text-xs">
            {examLabels[type]}
          </span>
          <h1 className="hidden truncate text-xl font-extrabold md:block [@media(max-height:850px)]:sr-only [@media(min-height:900px)]:text-2xl">
            Memorization Mode
          </h1>
          {/* Named, because a bare "27 / 49" beside a dashboard reading
              "memorize (20/49)" looks like the same count disagreeing with
              itself. This one is a place in the deck; mastery is in the panel. */}
          <span className="ml-auto shrink-0 whitespace-nowrap text-sm font-extrabold tabular-nums">
            <span className="font-bold text-muted-foreground">Question </span>
            {index + 1}
            <span className="text-muted-foreground"> / {questions.length}</span>
          </span>
        </div>

        {/* Says where the set picked up, so a resumed sitting never looks like
            a restarted one. */}
        {resumedAt === index && (
          <p className="rv-pop-in mt-2 w-fit shrink-0 rounded-lg border border-[#C9A227] bg-[#FFF8D6] px-3 py-1 text-xs font-bold text-[#0B2340]">
            Resumed at question {index + 1} of {questions.length}
          </p>
        )}

        <div className="mt-3 h-2 shrink-0 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#8A6D0B] transition-[width] duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="mt-4 grid min-h-0 flex-1 gap-4 overflow-y-auto lg:grid-cols-[2.6fr_1fr] lg:overflow-hidden">
          <div className="flex min-h-0 flex-col">
            <section className="rv-card relative flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-6 [@media(max-height:700px)]:p-3">
              <Confetti
                // celebration only moves on an answer given here, so a resumed
                // correct answer redraws its feedback without firing the burst
                // a second time.
                active={
                  checked && message?.mood === "correct" && celebration > 0
                }
                runId={celebration}
                pieces={message?.milestone ? 34 : 20}
              />

              {/* Same verdict flashcards give: the whole card face takes the
                  colour, so the answer reads from across the room. It clears
                  itself after a beat, uncovering the graded choices the
                  learner still has to read before Next. */}
              {verdict && (
                <div
                  role="status"
                  className={`rv-pop-in pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 rounded-[var(--radius)] p-8 text-center text-white ${
                    verdict.mood === "correct" ? "bg-[#0F7B52]" : "bg-[#C91D1D]"
                  }`}
                >
                  <p className="text-3xl font-extrabold leading-tight sm:text-4xl">
                    {verdict.headline}
                  </p>
                  {verdict.mood === "correct" ? (
                    <Check className="size-14" strokeWidth={3} />
                  ) : (
                    <X className="size-14" strokeWidth={3} />
                  )}
                </div>
              )}

              {/* The concept tag is the first thing the card drops when the
                  window is too short to hold the question at a legible size. */}
              <span className="inline-block w-fit shrink-0 rounded-full bg-[#0B2340] px-3 py-1 text-xs font-bold text-[#FFD400] [@media(max-height:700px)]:hidden">
                Concept: {question.category}
              </span>

              {/* Question and choices share the room the card has left. Every
                  size below is an em of the fitted base, so a long question
                  scales itself down rather than scrolling the screen away. */}
              <div
                ref={fit.boxRef}
                className="mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
              >
                <div
                  ref={fit.contentRef}
                  style={{ fontSize: fit.fontSize }}
                  className="my-auto w-full"
                >
                  <h2 className="text-[1.3em] font-extrabold leading-[1.4]">
                    {parts?.prompt}
                  </h2>

                  {parts && parts.statements.length > 0 && (
                    <div className="mt-[0.6em] flex flex-col gap-[0.4em]">
                      {parts.statements.map((statement) => (
                        <p
                          key={statement}
                          className="rounded-lg bg-muted px-[0.9em] py-[0.55em] text-[0.95em] leading-[1.45]"
                        >
                          {statement}
                        </p>
                      ))}
                    </div>
                  )}

                  <div
                    className={`mt-[0.7em] grid gap-[0.45em] ${
                      pairChoices ? "sm:grid-cols-2" : ""
                    }`}
                  >
                    {question.choices.map((choice, choiceIndex) => {
                      const isChosen = selected === choice.id;
                      const isCorrect = choice.id === correctChoiceId;

                      const state = checked
                        ? isCorrect
                          ? "border-emerald-500 bg-emerald-50"
                          : isChosen
                            ? "border-rose-500 bg-rose-50"
                            : "border-border opacity-60"
                        : isChosen
                          ? "border-[#8A6D0B] bg-[#FBF7EE]"
                          : "border-border hover:border-[#C9A227]";

                      return (
                        <button
                          key={choice.id}
                          type="button"
                          disabled={checked}
                          onClick={() => setSelected(choice.id)}
                          className={`flex items-center gap-[0.8em] rounded-lg border-2 px-[0.9em] py-[0.65em] text-left text-[1.05em] leading-[1.35] transition disabled:cursor-default ${state}`}
                        >
                          <span
                            className={`flex size-[1.9em] shrink-0 items-center justify-center rounded-full border text-[0.8em] font-bold ${
                              isChosen && !checked
                                ? "border-[#8A6D0B] bg-[#FFD400] text-[#0B2340]"
                                : "border-border text-muted-foreground"
                            }`}
                          >
                            {String.fromCharCode(65 + choiceIndex)}
                          </span>
                          {choice.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-3 flex shrink-0 items-center justify-between gap-4 rounded-xl bg-[#0B2340] px-4 py-2.5 sm:px-6">
              <button
                onClick={skip}
                disabled={checked}
                className="text-sm font-bold text-white transition hover:text-[#FFD400] disabled:opacity-40"
              >
                Skip Question
              </button>

              {checked ? (
                <button
                  onClick={advance}
                  className="rounded-lg bg-[#FFD400] px-6 py-2.5 text-sm font-bold text-[#0B2340] transition hover:bg-[#E8C200]"
                >
                  {index === questions.length - 1
                    ? "Finish Session"
                    : "Next Question"}
                </button>
              ) : (
                <button
                  onClick={submit}
                  disabled={!selected}
                  className="rounded-lg bg-[#FFD400] px-6 py-2.5 text-sm font-bold text-[#0B2340] transition hover:bg-[#E8C200] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Submit Answer
                </button>
              )}
            </div>
          </div>

          <aside className="flex min-h-0 flex-col gap-4 lg:overflow-y-auto">
            {/* Below the two-column breakpoint the sidebar would steal a row
                from the question, so the stats wait for a wide window. */}
            <div className="hidden lg:block">
              <SessionMastery
                accuracy={accuracy}
                averageSeconds={averageSeconds}
                trackMastery={trackMastery}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
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
      <main className="rv-shell py-10">
        <BackLink />
        <span className="inline-block rounded-full bg-[#FFD400] px-3 py-1 text-xs font-bold text-[#0B2340]">
          {examLabels[type]} Track
        </span>
        <h1 className="mt-3 text-4xl font-extrabold">Memorization Mode</h1>
        <p className="mt-4 text-sm text-muted-foreground">{children}</p>
      </main>
    </div>
  );
}

export function MemorizationPage() {
  return (
    <Suspense fallback={<Shell type="VUL">Loading questions…</Shell>}>
      <MemorizationContent />
    </Suspense>
  );
}
