"use client";

import { AppNav } from "@/components/ui/app-nav";
import { BackLink } from "@/components/ui/back-link";
import { Result } from "@/components/ui/result";
import type { Eligibility } from "@/lib/types/eligibility";
import { lockReason } from "@/lib/helper/eligibility";
import {
  PASSING_PERCENTAGE,
  hasPassedTrack,
  passesLabel,
} from "@/lib/helper/practice-exam";
import { examLabels, parseExamType } from "@/lib/types/common";
import type { Question } from "@/lib/types/questions";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

const shuffled = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

/**
 * The paper this sitting was dealt, in the order the attempt recorded.
 *
 * The order belongs to the attempt rather than to the page, so a refresh
 * returns to the same questions in the same places instead of reshuffling
 * under answers already given. Questions added to the track since the sitting
 * began go on the end; ones withdrawn since simply drop out. An attempt with
 * no stored order — one dealt before this was kept — falls back to a shuffle.
 */
function dealt(
  items: Question[],
  attempt: { question_order?: unknown } | null,
) {
  const order = Array.isArray(attempt?.question_order)
    ? (attempt.question_order as string[])
    : null;
  if (!order) return shuffled(items);

  const byId = new Map(items.map((item) => [item.id, item]));
  const inOrder = order
    .map((id) => byId.get(id))
    .filter((item): item is Question => Boolean(item));

  const seen = new Set(inOrder.map((item) => item.id));
  return [...inOrder, ...items.filter((item) => !seen.has(item.id))];
}

/** Jumps to the top of the page, honouring a reduced-motion preference. */
const toTop = () => {
  if (typeof window === "undefined") return;
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
};

function PracticeExamContent() {
  const searchParams = useSearchParams();
  const type = parseExamType(searchParams.get("exam_type"));

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<Question["id"], string>>({});
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [error, setError] = useState("");
  /**
   * The verdict the server gave this sitting, plus where the track stands
   * after it. A sitting is passed or failed on its own; the track needs
   * PASSES_REQUIRED passes, so the result screen reports both.
   */
  const [outcome, setOutcome] = useState<{
    passed: boolean;
    passes: number;
  } | null>(null);

  /** Questions whose save has not come back yet, re-sent at submit. */
  const unsaved = useRef<Set<string>>(new Set());
  /** The current answers, readable inside a fetch callback. */
  const answersRef = useRef(answers);
  answersRef.current = answers;

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
        setQuestions(dealt(Array.isArray(items) ? items : [], attempt));
        setFinished(false);
        setAttemptId(attempt?.id ?? null);

        // The sitting resumes with the answers already picked: they belong to
        // the attempt, not to this page, so a refresh no longer clears them.
        const saved = attempt?.id
          ? await fetch(`/api/attempts/${attempt.id}`)
              .then(
                (response) =>
                  response.json() as Promise<{
                    answers?: {
                      question_id: string;
                      selected_choice_id: string | null;
                    }[];
                  }>,
              )
              .catch(() => ({ answers: [] }))
          : { answers: [] };

        if (!active) return;
        setAnswers(
          Object.fromEntries(
            (saved.answers ?? [])
              .filter((row) => row.selected_choice_id)
              .map((row) => [
                row.question_id,
                row.selected_choice_id as string,
              ]),
          ),
        );
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

  /**
   * Records a choice against the attempt as it is made.
   *
   * The selection shows immediately and the write follows, so picking an
   * answer never waits on the network. A write that fails is remembered in
   * `unsaved` and posted again at submit, which is what keeps a dropped
   * request from quietly costing a question.
   */
  const choose = (questionId: string, choiceId: string) => {
    setAnswers((current) => ({ ...current, [questionId]: choiceId }));
    if (!attemptId) return;

    unsaved.current.add(questionId);
    fetch(`/api/attempts/${attemptId}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_id: questionId,
        selected_choice_id: choiceId,
      }),
    })
      .then((response) => {
        // Only clear it if this is still the answer that was saved: a quick
        // second click must not be marked saved by the first request.
        if (response.ok && answersRef.current[questionId] === choiceId) {
          unsaved.current.delete(questionId);
        }
      })
      .catch((error) => console.error("Failed to save answer:", error));
  };

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
      // Most answers were saved as they were picked; only the ones whose write
      // has not come back go again here, so a dropped request cannot cost a
      // question at the moment it is scored.
      const pending = questions.filter((question) =>
        unsaved.current.has(question.id),
      );

      await Promise.all(
        pending.map((question) =>
          fetch(`/api/attempts/${attemptId}/answers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question_id: question.id,
              selected_choice_id: answers[question.id],
            }),
          }).then((response) => {
            if (response.ok) unsaved.current.delete(question.id);
          }),
        ),
      );

      const completed = (await fetch(`/api/attempts/${attemptId}/complete`, {
        method: "POST",
      }).then((response) => response.json())) as {
        passed?: boolean;
        passes?: number;
      };

      setOutcome({
        passed: Boolean(completed?.passed),
        passes: Number(completed?.passes ?? 0),
      });
      setFinished(true);
      // The verdict is at the top of a page as long as the exam was, and the
      // submit button sits at the bottom of it. Without this the learner lands
      // on the answer review and has to scroll up to learn whether they passed.
      toTop();
    } catch (submitError) {
      console.error("Failed to submit practice exam:", submitError);
      setError("Something went wrong submitting your exam. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Sitting again means a new attempt row: the finished one is scored and
   * counted, and posting more answers to it would rewrite a result the roster
   * has already read.
   */
  const retake = async () => {
    setError("");
    setSubmitting(true);

    try {
      const attempt = await fetch(`/api/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam_type: type }),
      }).then((response) => response.json());

      if (!attempt?.id) {
        setError(attempt?.error ?? "Could not start another exam.");
        return;
      }

      setAttemptId(attempt.id);
      // A new sitting is a new paper: the server dealt one with the attempt,
      // and that is the only point at which the order changes.
      setQuestions((current) => dealt(current, attempt));
      setAnswers({});
      unsaved.current.clear();
      setOutcome(null);
      setFinished(false);
      toTop();
    } catch (retakeError) {
      console.error("Failed to start another practice exam:", retakeError);
      setError("Could not reach the server. Try again.");
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
        <section className="rv-card mx-auto w-full max-w-xl p-[clamp(1.25rem,5vw,1.75rem)]">
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
    const trackPassed = hasPassedTrack(outcome?.passes ?? 0);

    return (
      <Frame title={`${examLabels[type]} Results`}>
        <div className="mx-auto w-full max-w-2xl">
          {/* The verdict first: a percentage does not say whether the sitting
              cleared the bar, and the counter says how much of the track is
              behind them. */}
          <section
            className={`rv-card mb-4 flex flex-col items-start justify-between gap-3 p-[clamp(1rem,4vw,1.25rem)] xs:flex-row xs:items-center ${
              outcome?.passed
                ? "border-2 border-[#0F7B52]"
                : "border-2 border-[#C91D1D]"
            }`}
          >
            <div>
              <p
                className={`text-2xl font-extrabold ${
                  outcome?.passed ? "text-[#0F7B52]" : "text-[#C91D1D]"
                }`}
              >
                {outcome?.passed ? "PASSED" : "FAILED"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {outcome?.passed
                  ? `You cleared this sitting at ${PASSING_PERCENTAGE}% or better.`
                  : `You need ${PASSING_PERCENTAGE}% to pass a sitting. Take it again.`}
              </p>
            </div>

            <div className="w-full text-left xs:w-auto xs:text-right">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Exams passed
              </p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">
                {passesLabel(outcome?.passes ?? 0)}
              </p>
              {trackPassed && (
                <p className="text-xs font-bold text-[#0F7B52]">
                  Track complete
                </p>
              )}
            </div>
          </section>

          <Result
            correct={score}
            wrong={wrongQuestions.length}
            onTryAgain={retake}
            accent="exam"
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
      <div className="w-full">
        {/* No shuffle control: the order is dealt with the sitting and holds
            until the exam is finished and taken again, so a reorder mid-paper
            would move questions under answers already given. */}
        <div className="flex flex-col gap-4">
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
                      onClick={() => choose(question.id, choice.id)}
                      className={`flex items-center gap-4 rounded-lg border-2 px-4 py-3 text-left text-sm transition ${
                        chosen
                          ? "border-[var(--exam)] bg-[var(--exam-soft)]"
                          : "border-border hover:border-[var(--exam)]"
                      }`}
                    >
                      <span
                        className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                          chosen
                            ? "border-[var(--exam)] bg-[var(--exam)] text-white"
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
          className="sticky bottom-5 mt-5 w-full rounded-lg bg-[var(--exam)] px-5 py-3.5 font-bold text-white transition hover:bg-[var(--exam-strong)] disabled:opacity-60"
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
      <main className="rv-shell py-[clamp(1.5rem,4vw,2.5rem)]">
        {/* One column for the whole screen: the way back, the title and the
            questions share an edge and centre together, instead of the heading
            hugging the shell while the cards sat in a narrower column of their
            own. */}
        <div className="mx-auto w-full max-w-3xl">
          <BackLink />
          {/* Fluid rather than a jump at md: the title is the tallest thing
              here, and on a short window that jump costs a question. */}
          <h1 className="mb-[clamp(1rem,3vw,1.5rem)] text-[clamp(1.75rem,5.5vw,3rem)] font-extrabold leading-tight">
            {title}
          </h1>
          {children}
        </div>
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
