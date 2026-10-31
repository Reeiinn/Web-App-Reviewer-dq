import "server-only";
import prisma from "@/server/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { ExamType } from "@/lib/types/common";
import { sittingPassed } from "@/lib/helper/practice-exam";

/**
 * Practice-exam sittings: dealing a paper, resuming it, the answers saved
 * against it and its score. Every query on exam_attempts and
 * exam_attempt_answers goes through here, as do the question_progress and
 * user_progress writes a sitting makes.
 *
 * Rows on the legacy IIAP track still exist, so exam_type is cast rather
 * than filtered, as content.ts does.
 */

const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 10_000 };

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

export type FinishedAttempt = {
  id: string;
  score: number;
  totalItems: number;
  passed: boolean;
  completedAt: Date;
};

/**
 * One track's finished sittings, newest first, for the past-exams list. An
 * unfinished sitting has no score yet and is left out.
 */
export async function listFinishedAttempts(
  userId: string,
  examType: ExamType,
): Promise<FinishedAttempt[]> {
  const rows = await prisma.examAttempt.findMany({
    where: { userId, examType, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    select: { id: true, score: true, totalItems: true, passed: true, completedAt: true },
  });
  return rows.map((row) => ({ ...row, completedAt: row.completedAt as Date }));
}

/** Who an attempt belongs to; null if there is no such attempt. */
export async function findAttemptOwner(attemptId: string): Promise<string | null> {
  const row = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: { userId: true },
  });
  return row?.userId ?? null;
}

/** Whether a choice is right; null if it is not one of that question's options. */
export async function choiceCorrectness(
  choiceId: string,
  questionId: string,
): Promise<boolean | null> {
  const choice = await prisma.choice.findFirst({
    where: { id: choiceId, questionId },
    select: { isCorrect: true },
  });
  return choice?.isCorrect ?? null;
}

export type ExamAnswerRecord = {
  id: string;
  attemptId: string;
  questionId: string;
  selectedChoiceId: string | null;
  isCorrect: boolean;
};

/**
 * Saves one answer against a sitting, and the learner's progress on that
 * question, together.
 *
 * Answers are saved as they are picked, so the same question arrives again
 * whenever the learner changes their mind. The row is replaced rather than
 * added to: two rows for one question would both count toward the score.
 * Question progress counts every answer, and `mastered` follows the latest
 * one, so a question answered wrong after being right is no longer mastered.
 */
export async function recordExamAnswer(input: {
  attemptId: string;
  userId: string;
  questionId: string;
  selectedChoiceId: string;
  isCorrect: boolean;
}): Promise<ExamAnswerRecord> {
  const { attemptId, userId, questionId, selectedChoiceId, isCorrect } = input;

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const saved = await tx.examAttemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId } },
      create: { attemptId, questionId, selectedChoiceId, isCorrect },
      update: { selectedChoiceId, isCorrect },
      select: {
        id: true,
        attemptId: true,
        questionId: true,
        selectedChoiceId: true,
        isCorrect: true,
      },
    });

    await tx.questionProgress.upsert({
      where: { userId_questionId: { userId, questionId } },
      create: {
        userId,
        questionId,
        selectedChoiceId,
        isCorrect,
        timesSeen: 1,
        timesCorrect: isCorrect ? 1 : 0,
        mastered: isCorrect,
        lastReviewedAt: now,
      },
      update: {
        selectedChoiceId,
        isCorrect,
        timesSeen: { increment: 1 },
        timesCorrect: { increment: isCorrect ? 1 : 0 },
        mastered: isCorrect,
        lastReviewedAt: now,
      },
    });

    return saved;
  }, TRANSACTION_OPTIONS);
}

/**
 * Scores a sitting from the answers saved against it and closes it. A pass
 * adds to user_progress.pass_count; the set_updated_at trigger stamps it.
 *
 * The passes returned are counted off the attempts themselves rather than
 * the running total, so a result screen can never disagree with the roster
 * that reads the same rows.
 */
export async function completeAttempt(
  attemptId: string,
): Promise<{ attempt: AttemptRecord; passes: number }> {
  return prisma.$transaction(async (tx) => {
    const answers = await tx.examAttemptAnswer.findMany({
      where: { attemptId },
      select: { isCorrect: true },
    });
    const totalItems = answers.length;
    const score = answers.filter((a) => a.isCorrect).length;
    const passed = sittingPassed(score, totalItems);

    const row = await tx.examAttempt.update({
      where: { id: attemptId },
      data: { score, totalItems, passed, completedAt: new Date() },
      select: attemptSelect,
    });

    const track = { userId: row.userId, examType: row.examType };
    if (passed) {
      await tx.userProgress.upsert({
        where: { userId_examType: track },
        create: { ...track, passCount: 1 },
        update: { passCount: { increment: 1 } },
      });
    }

    const passes = await tx.examAttempt.count({
      where: { ...track, passed: true, completedAt: { not: null } },
    });

    return { attempt: asAttempt(row), passes };
  }, TRANSACTION_OPTIONS);
}
