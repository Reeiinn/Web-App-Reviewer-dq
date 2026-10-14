import "server-only";
import prisma from "@/server/db/prisma";
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

export async function fetchStreaks(userId: string): Promise<StreakRow[]> {
  const rows = await prisma.studyStreak.findMany({
    where: { userId },
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
): Promise<RecentActivityRow[]> {
  const rows = await prisma.recentActivity.findMany({
    where: { userId },
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
