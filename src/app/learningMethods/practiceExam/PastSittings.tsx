"use client";

import { fresh } from "@/lib/helper/fetch-fresh";
import {
  reviewRows,
  sittingSummary,
  type AttemptAnswer,
  type ReviewRow,
} from "@/lib/helper/past-sittings";
import { sittingPassed } from "@/lib/helper/practice-exam";
import type { ExamAttempt } from "@/lib/types/attempt";
import { examLabels, type ExamType } from "@/lib/types/common";
import type { Question } from "@/lib/types/questions";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Frame } from "./frame";
import { PracticeExamBodySkeleton } from "./PracticeExamSkeleton";
import { QuestionText, ReviewChoices } from "./review-choices";

/**
 * Every practice exam a reviewee has finished on one track, and each one's
 * paper with their own answers marked.
 *
 * Read only. Nothing here deals a paper or checks the study gate, so it opens
 * for someone who passed the real exam whatever state their decks are in.
 */
export function PastSittings({ type }: { type: ExamType }) {
  const attemptId = useSearchParams().get("attempt");
  return attemptId ? (
    <SittingDetail type={type} attemptId={attemptId} />
  ) : (
    <SittingList type={type} />
  );
}

const historyHref = (type: ExamType) =>
  `/learningMethods/practiceExam?exam_type=${type}&mode=history`;

const sittingDate = (stamp: string) =>
  new Date(stamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

/** One finished sitting, as GET /api/attempts/history lists it. */
type FinishedSitting = {
  id: string;
  score: number;
  total_items: number;
  passed: boolean;
  completed_at: string;
};

function SittingList({ type }: { type: ExamType }) {
  const [sittings, setSittings] = useState<FinishedSitting[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    // Finished sittings only, newest first: an unfinished one has no score.
    fetch(`/api/attempts/history?exam_type=${encodeURIComponent(type)}`, fresh)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Failed to load");
        return data as FinishedSitting[];
      })
      .then((rows) => active && setSittings(rows))
      .catch((loadError) => active && setError(loadError.message));

    return () => {
      active = false;
    };
  }, [type]);

  return (
    <Frame title={`${examLabels[type]} · Past Exams`}>
      {error ? (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : sittings === null ? (
        <PracticeExamBodySkeleton />
      ) : sittings.length === 0 ? (
        <section className="rv-card p-6 text-sm text-muted-foreground">
          You haven&apos;t sat a practice exam on this track.
        </section>
      ) : (
        <ul className="flex flex-col gap-3">
          {sittings.map((sitting) => {
            const passed = sittingPassed(sitting.score, sitting.total_items);
            return (
              <li key={sitting.id}>
                <Link
                  href={`${historyHref(type)}&attempt=${sitting.id}`}
                  className="rv-card flex items-center justify-between gap-4 p-4 transition hover:border-[#C9A227]"
                >
                  <span>
                    <span className="block font-extrabold">
                      {sittingDate(sitting.completed_at)}
                    </span>
                    <span className="mt-0.5 block text-sm tabular-nums text-muted-foreground">
                      {sittingSummary(sitting.score, sitting.total_items)}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${
                        passed
                          ? "bg-[#E7F4EE] text-[#0F7B52]"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {passed ? "Passed" : "Not passed"}
                    </span>
                    <ArrowRight className="size-4 shrink-0" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Frame>
  );
}

type AttemptDetail = ExamAttempt & {
  question_order?: unknown;
  answers?: AttemptAnswer[];
};

function SittingDetail({
  type,
  attemptId,
}: {
  type: ExamType;
  attemptId: string;
}) {
  const [sitting, setSitting] = useState<AttemptDetail | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    (async () => {
      const response = await fetch(
        `/api/attempts/${encodeURIComponent(attemptId)}`,
      );
      const attempt = (await response.json()) as AttemptDetail & {
        error?: string;
      };
      if (!response.ok) throw new Error(attempt.error ?? "Failed to load");
      // A sitting still in progress is not a past exam: reading it here would
      // show the right answers to a paper that is still being sat.
      if (!attempt.completed_at) {
        throw new Error("This sitting isn't finished yet.");
      }

      // The paper is read from the sitting's own track, not the URL's, so a
      // link edited by hand cannot mark one exam's answers against another.
      const reply = await fetch(
        `/api/questions?exam_type=${encodeURIComponent(attempt.exam_type)}`,
        fresh,
      );
      const questions = await reply.json();
      // Without this check an empty paper reads as every question removed.
      if (!reply.ok) throw new Error(questions.error ?? "Failed to load");

      return [attempt, questions as Question[]] as const;
    })()
      .then(([attempt, questions]) => {
        if (!active) return;
        const order = Array.isArray(attempt.question_order)
          ? (attempt.question_order as string[])
          : null;
        setSitting(attempt);
        setRows(reviewRows(order, attempt.answers ?? [], questions));
      })
      .catch((loadError) => active && setError(loadError.message));

    return () => {
      active = false;
    };
  }, [attemptId, type]);

  return (
    <Frame title={`${examLabels[type]} · Past Exam`}>
      <Link
        href={historyHref(type)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#8A6D0B] hover:text-[#0B2340]"
      >
        <ArrowLeft className="size-4" />
        All past exams
      </Link>

      {error ? (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : !sitting ? (
        <PracticeExamBodySkeleton />
      ) : (
        <>
          <section className="rv-card mb-4 p-5">
            <p className="text-lg font-extrabold">
              {sitting.completed_at
                ? sittingDate(sitting.completed_at)
                : "Unfinished sitting"}
            </p>
            <p className="mt-1 text-sm tabular-nums text-muted-foreground">
              {sittingSummary(sitting.score, sitting.total_items)} ·{" "}
              {sittingPassed(sitting.score, sitting.total_items)
                ? "Passed"
                : "Not passed"}
            </p>
          </section>

          <div className="flex flex-col gap-4">
            {rows.map((row, index) => (
              <section key={`${row.questionId}-${index}`} className="rv-card border-2 p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-[#8A6D0B]">
                  Question {index + 1}
                  {!row.chosen && " · Left blank"}
                </p>
                {row.question ? (
                  <>
                    <QuestionText text={row.question.text} />
                    <ReviewChoices question={row.question} chosen={row.chosen} />
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    This question is no longer in the bank
                  </p>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </Frame>
  );
}
