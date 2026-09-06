"use client";

import { AppNav } from "@/components/ui/app-nav";
import { BackLink } from "@/components/ui/back-link";
import {
  AnswerFeedback,
  Confetti,
  SessionMastery,
  StreakBadge,
} from "@/components/ui/motivation";
import { Result } from "@/components/ui/result";
import { motivationFor, type MotivationMessage } from "@/lib/helper/motivation";
import { splitStatements } from "@/lib/helper/question-text";
import { examLabels, type ExamType } from "@/lib/types/common";
import type { MemorizationProgressResponse } from "@/lib/types/memo";
import type { Question } from "@/lib/types/questions";
import type { StreakRow } from "@/lib/types/streak";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

const shuffled = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

type StreakState = { current: number; best: number };

function MemorizationContent() {
  const searchParams = useSearchParams();
  const type: ExamType =
    searchParams.get("exam_type") === "TRADITIONAL_LIFE"
      ? "TRADITIONAL_LIFE"
      : "VUL";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [wrong, setWrong] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

  const [streak, setStreak] = useState<StreakState>({ current: 0, best: 0 });
  const [message, setMessage] = useState<MotivationMessage | null>(null);
  const [celebration, setCelebration] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const questionShownAt = useRef<number>(Date.now());

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch(`/api/memorization?exam_type=${encodeURIComponent(type)}`).then(
        (response) => response.json() as Promise<Question[]>,
      ),
      fetch("/api/streaks")
        .then((response) => response.json() as Promise<StreakRow[]>)
        .catch((): StreakRow[] => []),
    ])
      .then(([items, streaks]) => {
        if (!active) return;
        setQuestions(shuffled(Array.isArray(items) ? items : []));
        setIndex(0);
        setSelected(null);
        setChecked(false);
        setWrong([]);
        setFinished(false);
        questionShownAt.current = Date.now();

        const mine = Array.isArray(streaks)
          ? streaks.find((row) => row.exam_type === type)
          : null;
        if (mine) {
          setStreak({ current: mine.current_streak, best: mine.best_streak });
        }
      })
      .catch(() => active && setQuestions([]))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [type]);

  const question = questions[index];
  const correctChoiceId = question?.choices.find(
    (choice) => choice.is_correct,
  )?.id;
  const parts = question ? splitStatements(question.text) : null;

  const accuracy = answeredCount
    ? Math.round((correctCount / answeredCount) * 100)
    : 0;
  const averageSeconds = answeredCount
    ? Math.round(elapsedMs / answeredCount / 1000)
    : 0;

  const resetSession = (nextQuestions: Question[]) => {
    setQuestions(nextQuestions);
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setWrong([]);
    setFinished(false);
    setMessage(null);
    setAnsweredCount(0);
    setCorrectCount(0);
    setElapsedMs(0);
    questionShownAt.current = Date.now();
  };

  const submit = async () => {
    if (!question || !selected || checked || !correctChoiceId) return;

    const isCorrect = selected === correctChoiceId;
    setChecked(true);
    setAnsweredCount((count) => count + 1);
    setElapsedMs((total) => total + (Date.now() - questionShownAt.current));

    if (isCorrect) {
      setCorrectCount((count) => count + 1);
    } else {
      setWrong((current) =>
        current.some((item) => item.id === question.id)
          ? current
          : [...current, question],
      );
    }

    // Optimistic so the celebration is immediate; the server value replaces it.
    const optimistic = isCorrect ? streak.current + 1 : 0;
    setStreak((current) => ({
      current: optimistic,
      best: Math.max(current.best, optimistic),
    }));
    setMessage(motivationFor(isCorrect, optimistic, index));
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

      const data =
        (await response.json()) as Partial<MemorizationProgressResponse>;
      if (data.streak) {
        setStreak({ current: data.streak.current, best: data.streak.best });
        setMessage(motivationFor(isCorrect, data.streak.current, index));
      }
    } catch (error) {
      console.error("Failed to save memorization progress:", error);
    }
  };

  const advance = () => {
    setMessage(null);
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />

      <main className="rv-shell py-8">
        <BackLink />
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <span className="inline-block rounded-full bg-[#FFD400] px-3 py-1 text-xs font-bold text-[#0B2340]">
              {examLabels[type]} Track
            </span>
            <h1 className="mt-3 text-4xl font-extrabold md:text-5xl">
              Memorization Mode
            </h1>
            <p className="mt-2 max-w-xl text-muted-foreground">
              Master key concepts through spaced repetition and high-intensity
              recall. Select the correct answer to advance your streak.
            </p>
          </div>

          <div className="rv-card flex shrink-0 divide-x divide-border">
            <div className="px-6 py-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Current Streak
              </p>
              <div className="mt-2">
                <StreakBadge
                  current={streak.current}
                  best={streak.best}
                  pulse={checked && message?.mood === "correct"}
                />
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Session Progress
              </p>
              <p className="mt-2 text-2xl font-extrabold leading-none">
                {index + 1}
                <span className="text-base text-muted-foreground">
                  {" "}
                  / {questions.length}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="mt-7 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[#8A6D0B] transition-[width] duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <section className="rv-card relative overflow-hidden p-6">
              <Confetti
                active={checked && message?.mood === "correct"}
                runId={celebration}
                pieces={message?.milestone ? 34 : 20}
              />

              <span className="inline-block rounded-full bg-[#0B2340] px-3 py-1 text-xs font-bold text-[#FFD400]">
                Concept: {question.category}
              </span>

              <h2 className="mt-5 text-xl font-extrabold leading-8">
                {parts?.prompt}
              </h2>

              {parts && parts.statements.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                  {parts.statements.map((statement) => (
                    <p
                      key={statement}
                      className="rounded-lg bg-muted px-4 py-3 text-sm leading-6"
                    >
                      {statement}
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3">
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
                      className={`flex items-center gap-4 rounded-lg border-2 px-4 py-3.5 text-left text-sm transition disabled:cursor-default ${state}`}
                    >
                      <span
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
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
            </section>

            <div className="mt-5 flex items-center justify-between gap-4 rounded-xl bg-[#0B2340] px-6 py-4">
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

          <aside className="flex flex-col gap-5">
            <SessionMastery
              accuracy={accuracy}
              averageSeconds={averageSeconds}
            />

            {message && (
              <AnswerFeedback
                message={message}
                correctAnswer={
                  question.choices.find((choice) => choice.is_correct)?.text
                }
              />
            )}
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
