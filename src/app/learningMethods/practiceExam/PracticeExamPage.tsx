"use client";

import { AppNav } from "@/components/ui/app-nav";
import { BackLink } from "@/components/ui/back-link";
import { Result } from "@/components/ui/result";
import type { Eligibility } from "@/lib/types/eligibility";
import { lockReason } from "@/lib/helper/eligibility";
import { examLabels, type ExamType } from "@/lib/types/common";
import type { Question } from "@/lib/types/questions";
import { Lock, Shuffle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const shuffled = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

function PracticeExamContent() {
  const searchParams = useSearchParams();
  const type: ExamType =
    searchParams.get("exam_type") === "TRADITIONAL_LIFE"
      ? "TRADITIONAL_LIFE"
      : "VUL";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<Question["id"], string>>({});
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const check: Eligibility = await fetch(
          `/api/attempts/eligibility?exam_type=${encodeURIComponent(type)}`,
        ).then((response) => response.json());

        if (!active) return;
        setEligibility(check);

        if (!check.eligible) {
          setLoading(false);
          return;
        }

        const [items, attempt] = await Promise.all([
          fetch(`/api/questions?exam_type=${encodeURIComponent(type)}`).then(
            (response) => response.json() as Promise<Question[]>,
          ),
          fetch(`/api/attempts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ exam_type: type }),
          }).then((response) => response.json()),
        ]);

        if (!active) return;
        setQuestions(shuffled(Array.isArray(items) ? items : []));
        setAnswers({});
        setFinished(false);
        setAttemptId(attempt?.id ?? null);
        setLoading(false);
      } catch {
        if (active) {
          setQuestions([]);
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [type]);

  const correctIdOf = (question: Question) =>
    question.choices.find((choice) => choice.is_correct)?.id;

  const score = questions.filter(
    (question) => answers[question.id] === correctIdOf(question),
  ).length;
  const wrongQuestions = questions.filter(
    (question) => answers[question.id] !== correctIdOf(question),
  );

  const submit = async () => {
    if (!questions.length || !attemptId || submitting) return;

    const unanswered = questions
      .map((question, index) => (answers[question.id] ? null : index + 1))
      .filter((index): index is number => index !== null);

    if (unanswered.length) {
      setError(
        `Please answer question${unanswered.length === 1 ? "" : "s"}: ${unanswered.join(", ")}.`,
      );
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      await Promise.all(
        questions.map((question) =>
          fetch(`/api/attempts/${attemptId}/answers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question_id: question.id,
              selected_choice_id: answers[question.id],
            }),
          }),
        ),
      );

      await fetch(`/api/attempts/${attemptId}/complete`, { method: "POST" });
      setFinished(true);
    } catch (submitError) {
      console.error("Failed to submit practice exam:", submitError);
      setError("Something went wrong submitting your exam. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Frame title={`${examLabels[type]} Practice Exam`}>
        <p className="text-sm text-muted-foreground">
          Loading practice questions…
        </p>
      </Frame>
    );
  }

  if (eligibility && !eligibility.eligible) {
    return (
      <Frame title="Practice exam locked">
        <section className="rv-card max-w-xl p-7">
          <span className="flex size-11 items-center justify-center rounded-full bg-muted">
            <Lock className="size-5 text-muted-foreground" />
          </span>
          <h2 className="mt-4 text-xl font-extrabold">Not quite ready yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {lockReason(eligibility.flashcards, eligibility.memorization)}
          </p>

          <div className="mt-5 space-y-3">
            <Meter
              label="Flashcards"
              mastered={eligibility.flashcards.mastered}
              total={eligibility.flashcards.total}
            />
            <Meter
              label="Memorize"
              mastered={eligibility.memorization.mastered}
              total={eligibility.memorization.total}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/learningMethods/flashCard?exam_type=${type}`}
              className="rounded-lg bg-[#FFD400] px-4 py-2.5 text-sm font-bold text-[#0B2340] transition hover:bg-[#E8C200]"
            >
              Study flashcards
            </Link>
            <Link
              href={`/learningMethods/memorization?exam_type=${type}`}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-bold transition hover:border-[#C9A227]"
            >
              Practice memorize
            </Link>
          </div>
        </section>
      </Frame>
    );
  }

  if (finished) {
    return (
      <Frame title={`${examLabels[type]} Results`}>
        <div className="max-w-2xl">
          <Result
            correct={score}
            wrong={wrongQuestions.length}
            onTryAgain={() => {
              setQuestions((current) => shuffled(current));
              setAnswers({});
              setFinished(false);
            }}
          />

          <div className="mt-6 flex flex-col gap-4">
            {questions.map((question, index) => {
              const chosen = answers[question.id];
              const correctId = correctIdOf(question);
              const wasRight = chosen === correctId;

              return (
                <section
                  key={`${question.id}-${index}`}
                  className="rv-card p-5"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Question {index + 1} · {wasRight ? "Correct" : "Incorrect"}
                  </p>
                  <h2 className="mt-2 font-bold leading-7">{question.text}</h2>
                  <p className="mt-3 text-sm text-emerald-700">
                    <strong>Correct answer:</strong>{" "}
                    {question.choices.find((choice) => choice.is_correct)?.text}
                  </p>
                </section>
              );
            })}
          </div>
        </div>
      </Frame>
    );
  }

  return (
    <Frame title={`${examLabels[type]} Practice Exam`}>
      <div className="max-w-3xl">
        <button
          onClick={() => {
            setQuestions((current) => shuffled(current));
            setAnswers({});
          }}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold transition hover:border-[#C9A227]"
        >
          <Shuffle className="size-3.5" /> Shuffle
        </button>

        <div className="mt-5 flex flex-col gap-4">
          {questions.map((question, index) => (
            <section key={`${question.id}-${index}`} className="rv-card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-[#8A6D0B]">
                Question {index + 1}
              </p>
              <h2 className="mt-2 font-bold leading-7">{question.text}</h2>

              <div className="mt-4 flex flex-col gap-2.5">
                {question.choices.map((choice, choiceIndex) => {
                  const chosen = answers[question.id] === choice.id;
                  return (
                    <button
                      key={choice.id}
                      onClick={() =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: choice.id,
                        }))
                      }
                      className={`flex items-center gap-4 rounded-lg border-2 px-4 py-3 text-left text-sm transition ${
                        chosen
                          ? "border-[#8A6D0B] bg-[#FBF7EE]"
                          : "border-border hover:border-[#C9A227]"
                      }`}
                    >
                      <span
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                          chosen
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
          ))}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 text-sm font-semibold text-destructive"
          >
            {error}
          </p>
        )}

        <button
          onClick={submit}
          disabled={submitting}
          className="sticky bottom-5 mt-5 w-full rounded-lg bg-[#0B2340] px-5 py-3.5 font-bold text-white transition hover:bg-[#0F2E4D] disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Finish exam"}
        </button>
      </div>
    </Frame>
  );
}

function Meter({
  label,
  mastered,
  total,
}: {
  label: string;
  mastered: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-muted-foreground">
          {mastered}/{total}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[#8A6D0B]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Frame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />
      <main className="rv-shell py-10">
        <BackLink />
        <h1 className="mb-6 text-4xl font-extrabold md:text-5xl">{title}</h1>
        {children}
      </main>
    </div>
  );
}

export function PracticeExamPage() {
  return (
    <Suspense
      fallback={
        <Frame title="Practice Exam">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </Frame>
      }
    >
      <PracticeExamContent />
    </Suspense>
  );
}
