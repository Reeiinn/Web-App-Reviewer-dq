import "server-only";
import prisma from "@/server/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { ExamType } from "@/lib/types/common";

/**
 * Practice-exam sittings: dealing a paper, resuming it, the answers saved
 * against it and its score. Every query on exam_attempts and
 * exam_attempt_answers goes through here, as do the question_progress and
 * user_progress writes a sitting makes.
 *
 * Rows on the legacy IIAP track still exist, so exam_type is cast rather
 * than filtered, as content.ts does.
 */

export type AttemptRecord = {
  id: string;
  userId: string;
  examType: ExamType;
  score: number;
  totalItems: number;
  passed: boolean;
  startedAt: Date;
  completedAt: Date | null;
  questionOrder: unknown;
};

const attemptSelect = {
  id: true,
  userId: true,
  examType: true,
  score: true,
  totalItems: true,
  passed: true,
  startedAt: true,
  completedAt: true,
  questionOrder: true,
} as const;

type AttemptRow = Prisma.ExamAttemptGetPayload<{ select: typeof attemptSelect }>;

const asAttempt = (row: AttemptRow): AttemptRecord => ({
  ...row,
  examType: row.examType as ExamType,
});

/**
 * One sitting's question ids, in the order the learner will see them. A
 * Fisher–Yates shuffle, uniform like the ORDER BY random() it replaces.
 */
async function dealPaper(examType: ExamType): Promise<string[]> {
  const rows = await prisma.question.findMany({
    where: { examType },
    select: { id: true },
  });
  const ids = rows.map((row) => row.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

/** The learner's unfinished sitting on a track, the latest if there are several. */
export async function findOpenAttempt(
  userId: string,
  examType: ExamType,
): Promise<AttemptRecord | null> {
  const row = await prisma.examAttempt.findFirst({
    where: { userId, examType, completedAt: null },
    orderBy: { startedAt: "desc" },
    select: attemptSelect,
  });
  return row ? asAttempt(row) : null;
}

/**
 * The sitting a learner opens the practice exam into.
 *
 * Reopening the exam picks the unfinished sitting back up rather than
 * starting a second one. Every page load used to insert a row, so a refresh
 * abandoned the answers already saved against the old attempt. The paper is
 * dealt once, when the sitting starts, and kept with it. Sittings that
 * predate the stored order get one the first time they are reopened.
 */
export async function openAttempt(
  userId: string,
  examType: ExamType,
): Promise<{ attempt: AttemptRecord; created: boolean }> {
  const open = await findOpenAttempt(userId, examType);

  if (open) {
    if (open.questionOrder) return { attempt: open, created: false };

    const filled = await prisma.examAttempt.update({
      where: { id: open.id },
      data: { questionOrder: await dealPaper(examType) },
      select: attemptSelect,
    });
    return { attempt: asAttempt(filled), created: false };
  }

  const started = await prisma.examAttempt.create({
    data: {
      userId,
      examType,
      score: 0,
      totalItems: 0,
      passed: false,
      questionOrder: await dealPaper(examType),
    },
    select: attemptSelect,
  });
  return { attempt: asAttempt(started), created: true };
}

export async function findAttempt(id: string): Promise<AttemptRecord | null> {
  const row = await prisma.examAttempt.findUnique({
    where: { id },
    select: attemptSelect,
  });
  return row ? asAttempt(row) : null;
}

export type ReviewedAnswer = {
  id: string;
  questionId: string;
  selectedChoiceId: string | null;
  isCorrect: boolean;
  questionText: string;
};

/** The answers saved against a sitting. Unordered, as the old query was. */
export async function listAttemptAnswers(attemptId: string): Promise<ReviewedAnswer[]> {
  const rows = await prisma.examAttemptAnswer.findMany({
    where: { attemptId },
    select: {
      id: true,
      questionId: true,
      selectedChoiceId: true,
      isCorrect: true,
      question: { select: { text: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    questionId: row.questionId,
    selectedChoiceId: row.selectedChoiceId,
    isCorrect: row.isCorrect,
    questionText: row.question.text,
  }));
}

export type CompletedSitting = {
  examType: ExamType;
  passed: boolean;
  score: number;
  totalItems: number;
  completedAt: Date;
};

/** Every finished sitting a learner has taken, oldest first. */
export async function listCompletedSittings(userId: string): Promise<CompletedSitting[]> {
  const rows = await prisma.examAttempt.findMany({
    where: { userId, completedAt: { not: null } },
    orderBy: { completedAt: "asc" },
    select: { examType: true, passed: true, score: true, totalItems: true, completedAt: true },
  });

  return rows.map((row) => ({
    examType: row.examType as ExamType,
    passed: row.passed,
    score: row.score,
    totalItems: row.totalItems,
    completedAt: row.completedAt as Date,
  }));
}
