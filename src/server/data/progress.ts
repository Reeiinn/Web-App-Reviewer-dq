import "server-only";
import prisma from "@/server/db/prisma";
import { isUuid } from "@/lib/helper/removal";
import { nextStreak, streakMilestone } from "@/lib/helper/streaks";
import type { SavedSession } from "@/lib/helper/study-session";
import type { ExamType } from "@/lib/types/common";
import type { StreakResult, StreakRow } from "@/lib/types/streak";
import type { StudyMode } from "@/lib/types/study";

/**
 * What one learner has done: answers on each item, their streak per track,
 * which study modes they opened last, and where they are in a deck. Every
 * query on flashcard_progress, memorization_progress, study_streaks,
 * recent_activity and study_sessions goes through here.
 */

const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 10_000 };

/**
 * Applies one answer to the learner's streak on a track.
 *
 * The increment happens in the upsert itself, so two answers at once both
 * count. The upsert also locks the row until this transaction commits, so
 * the best-streak raise that follows sees the count it just made. The best
 * only ever rises: it is raised conditionally, never set downward.
 */
export async function applyStreak(
  userId: string,
  examType: string,
  isCorrect: boolean,
): Promise<StreakResult> {
  const track = examType as ExamType;
  const key = { userId_examType: { userId, examType: track } };

  const existing = await prisma.studyStreak.findUnique({
    where: key,
    select: { currentStreak: true, bestStreak: true },
  });
  const previous = existing
    ? { current: existing.currentStreak, best: existing.bestStreak }
    : { current: 0, best: 0 };
  const first = nextStreak({ current: 0, best: 0 }, isCorrect);

  const { current, best } = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const row = await tx.studyStreak.upsert({
      where: key,
      create: {
        userId,
        examType: track,
        currentStreak: first.current,
        bestStreak: first.best,
        lastAnswerAt: now,
      },
      update: {
        currentStreak: isCorrect ? { increment: 1 } : 0,
        lastAnswerAt: now,
      },
      select: { currentStreak: true, bestStreak: true },
    });

    if (row.currentStreak > row.bestStreak) {
      await tx.studyStreak.updateMany({
        where: { userId, examType: track, bestStreak: { lt: row.currentStreak } },
        data: { bestStreak: row.currentStreak },
      });
    }
    return {
      current: row.currentStreak,
      best: Math.max(row.bestStreak, row.currentStreak),
    };
  }, TRANSACTION_OPTIONS);

  return {
    current,
    best,
    isNewBest: current === best && current > previous.best,
    milestone: streakMilestone(current),
  };
}

export async function fetchStreaks(
  userId: string,
  tracks: readonly ExamType[],
): Promise<StreakRow[]> {
  const rows = await prisma.studyStreak.findMany({
    where: { userId, examType: { in: [...tracks] } },
    select: { examType: true, currentStreak: true, bestStreak: true, lastAnswerAt: true },
  });

  return rows.map((row) => ({
    exam_type: row.examType as ExamType,
    current_streak: row.currentStreak,
    best_streak: row.bestStreak,
    last_answer_at: row.lastAnswerAt?.toISOString() ?? null,
  }));
}

export type RecentActivityRow = {
  exam_type: ExamType;
  mode: StudyMode;
  visited_at: string;
};

/** Records that a learner just opened a study mode on a track, bumping it to the top of Quick Access. */
export async function recordVisit(
  userId: string,
  examType: ExamType,
  mode: StudyMode,
): Promise<void> {
  const visitedAt = new Date();
  await prisma.recentActivity.upsert({
    where: { userId_examType_mode: { userId, examType, mode } },
    create: { userId, examType, mode, visitedAt },
    update: { visitedAt },
  });
}

export async function fetchRecent(
  userId: string,
  limit: number,
  /** Only these tracks; filtered before the limit so Quick Access still fills. */
  tracks: readonly ExamType[],
): Promise<RecentActivityRow[]> {
  const rows = await prisma.recentActivity.findMany({
    where: { userId, examType: { in: [...tracks] } },
    orderBy: { visitedAt: "desc" },
    take: limit,
    select: { examType: true, mode: true, visitedAt: true },
  });

  return rows.map((row) => ({
    exam_type: row.examType as ExamType,
    mode: row.mode as StudyMode,
    visited_at: row.visitedAt.toISOString(),
  }));
}

const sessionKey = (userId: string, examType: ExamType, mode: StudyMode) => ({
  userId_examType_mode: { userId, examType, mode },
});

const isPlainObject = (value: unknown): value is Record<string, boolean> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/**
 * Persisted deck position for one learner, track and study mode. The columns
 * are jsonb, so a row is read defensively: anything that is not the shape we
 * write loads as an empty position rather than breaking the deck.
 */
export async function loadSession(
  userId: string,
  examType: ExamType,
  mode: StudyMode,
): Promise<SavedSession | null> {
  const row = await prisma.studySession.findUnique({
    where: sessionKey(userId, examType, mode),
    select: { cardOrder: true, cardIndex: true, ratings: true },
  });
  if (!row) return null;

  return {
    card_order: Array.isArray(row.cardOrder) ? (row.cardOrder as string[]) : [],
    card_index: Number(row.cardIndex) || 0,
    ratings: isPlainObject(row.ratings) ? row.ratings : {},
  };
}

/** Replaces the saved position. study_sessions has no updated_at trigger. */
export async function saveSession(
  userId: string,
  examType: ExamType,
  mode: StudyMode,
  saved: SavedSession,
): Promise<void> {
  const data = {
    cardOrder: saved.card_order,
    cardIndex: saved.card_index,
    ratings: saved.ratings,
    updatedAt: new Date(),
  };
  await prisma.studySession.upsert({
    where: sessionKey(userId, examType, mode),
    create: { userId, examType, mode, ...data },
    update: data,
  });
}

export async function clearSession(
  userId: string,
  examType: ExamType,
  mode: StudyMode,
): Promise<void> {
  await prisma.studySession.deleteMany({ where: { userId, examType, mode } });
}

/** The track a flashcard belongs to; null if there is no such card. */
export async function findFlashcardTrack(flashcardId: string): Promise<ExamType | null> {
  if (!isUuid(flashcardId)) return null;
  const card = await prisma.flashcard.findUnique({
    where: { id: flashcardId },
    select: { examType: true },
  });
  return (card?.examType as ExamType | undefined) ?? null;
}

export type FlashcardReview = {
  id: string;
  userId: string;
  flashcardId: string;
  reviewedAt: Date;
  mastered: boolean;
};

/**
 * "A card counts as mastered once you have" — the About page's words. A
 * card known in one pass and missed in the next stays mastered, so repeated
 * runs add to the tally instead of trading one card for another.
 */
export async function recordFlashcardReview(
  userId: string,
  flashcardId: string,
  mastered: boolean,
): Promise<FlashcardReview> {
  const reviewedAt = new Date();
  return prisma.flashcardProgress.upsert({
    where: { userId_flashcardId: { userId, flashcardId } },
    create: { userId, flashcardId, reviewedAt, mastered },
    update: mastered ? { reviewedAt, mastered: true } : { reviewedAt },
    select: { id: true, userId: true, flashcardId: true, reviewedAt: true, mastered: true },
  });
}

/** The track a memorization item belongs to; null if there is no such item. */
export async function findMemorizationTrack(
  memorizationId: string,
): Promise<ExamType | null> {
  if (!isUuid(memorizationId)) return null;
  const item = await prisma.memorization.findUnique({
    where: { id: memorizationId },
    select: { examType: true },
  });
  return (item?.examType as ExamType | undefined) ?? null;
}

/** Whether a choice is right; null if it is not one of this item's options. */
export async function memorizationChoiceCorrectness(
  choiceId: string,
  memorizationId: string,
): Promise<boolean | null> {
  if (!isUuid(choiceId)) return null;
  const choice = await prisma.memorizationChoice.findFirst({
    where: { id: choiceId, memorizationId },
    select: { isCorrect: true },
  });
  return choice?.isCorrect ?? null;
}

export type MemorizationAnswer = {
  id: string;
  userId: string;
  memorizationId: string;
  selectedChoiceId: string | null;
  isCorrect: boolean | null;
  reviewedAt: Date;
  mastered: boolean;
};

/**
 * Records the learner's latest answer. Mastery only ever goes up: an item
 * mastered once stays mastered even if a later pass gets it wrong, while
 * isCorrect and the selected choice always describe the last answer.
 */
export async function recordMemorizationAnswer(input: {
  userId: string;
  memorizationId: string;
  selectedChoiceId: string;
  isCorrect: boolean;
  mastered: boolean;
}): Promise<MemorizationAnswer> {
  const { userId, memorizationId, selectedChoiceId, isCorrect, mastered } = input;
  const reviewedAt = new Date();
  const answer = { selectedChoiceId, isCorrect, reviewedAt };
  return prisma.memorizationProgress.upsert({
    where: { userId_memorizationId: { userId, memorizationId } },
    create: { userId, memorizationId, ...answer, mastered },
    update: mastered ? { ...answer, mastered: true } : answer,
    select: {
      id: true,
      userId: true,
      memorizationId: true,
      selectedChoiceId: true,
      isCorrect: true,
      reviewedAt: true,
      mastered: true,
    },
  });
}
