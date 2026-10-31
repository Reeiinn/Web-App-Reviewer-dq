import "server-only";
import prisma from "@/server/db/prisma";
import type { ExamType } from "@/lib/types/common";
import type {
  ExamResults,
  LicensingOutcome,
  ResultMark,
} from "@/lib/types/exam-results";

/**
 * Licensing exam results: how a reviewee did on the real exam, recorded by
 * staff. One current mark per reviewee per exam; who changed it and from what
 * is in admin_actions, so every query here only asks what it says now.
 */

/** A mark with the role of the account that made it, for the staff screens. */
export type StaffResultMark = ResultMark & {
  markedByRole: "ADMIN" | "MANAGER" | null;
};

/** Every mark for these reviewees, with who made it, keyed by reviewee. */
export async function resultsFor(
  userIds: string[],
): Promise<Map<string, Partial<Record<ExamType, StaffResultMark>>>> {
  const byUser = new Map<string, Partial<Record<ExamType, StaffResultMark>>>();
  if (userIds.length === 0) return byUser;

  const rows = await prisma.examResult.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      examType: true,
      outcome: true,
      markedAt: true,
      marker: { select: { name: true, role: true } },
    },
  });

  for (const row of rows) {
    const marks = byUser.get(row.userId) ?? {};
    marks[row.examType as ExamType] = {
      outcome: row.outcome as LicensingOutcome,
      markedAt: row.markedAt.toISOString(),
      markedBy: row.marker?.name ?? null,
      markedByRole:
        row.marker?.role === "ADMIN" || row.marker?.role === "MANAGER"
          ? row.marker.role
          : null,
    };
    byUser.set(row.userId, marks);
  }

  return byUser;
}

/** One reviewee's outcomes alone, for the screens that only need the verdict. */
export async function outcomesFor(userId: string): Promise<ExamResults> {
  const rows = await prisma.examResult.findMany({
    where: { userId },
    select: { examType: true, outcome: true },
  });
  return Object.fromEntries(
    rows.map((row) => [row.examType, row.outcome as LicensingOutcome]),
  ) as ExamResults;
}

/** The outcome on one exam, or undefined while it is unmarked. */
export async function outcomeFor(
  userId: string,
  examType: ExamType,
): Promise<LicensingOutcome | undefined> {
  const row = await prisma.examResult.findUnique({
    where: { userId_examType: { userId, examType } },
    select: { outcome: true },
  });
  return (row?.outcome as LicensingOutcome | undefined) ?? undefined;
}

/**
 * Whether the real exam behind a sitting has been passed, which closes the
 * sitting. False for an attempt that does not exist; the routes answer that
 * case themselves.
 */
export async function licensedOnAttempt(attemptId: string): Promise<boolean> {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: { userId: true, examType: true },
  });
  if (!attempt) return false;
  return (
    (await outcomeFor(attempt.userId, attempt.examType as ExamType)) === "PASSED"
  );
}

/**
 * Records or replaces a mark, and returns what it replaced. Null when the
 * reviewee has not picked that exam, which saves nothing. The pick is read
 * under the lock setFocusTracks takes, so it cannot change underneath the mark.
 */
export async function markResult(input: {
  userId: string;
  examType: ExamType;
  outcome: LicensingOutcome;
  markedBy: string;
}): Promise<{ previous: LicensingOutcome | null } | null> {
  const key = { userId: input.userId, examType: input.examType };
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM users WHERE id = ${input.userId}::uuid FOR UPDATE`;
    const picked = await tx.userFocusTrack.findFirst({ where: key });
    if (!picked) return null;

    const previous = await tx.examResult.findUnique({
      where: { userId_examType: key },
      select: { outcome: true },
    });
    await tx.examResult.upsert({
      where: { userId_examType: key },
      create: { ...key, outcome: input.outcome, markedBy: input.markedBy },
      update: {
        outcome: input.outcome,
        markedBy: input.markedBy,
        markedAt: new Date(),
      },
    });
    return {
      previous: (previous?.outcome as LicensingOutcome | undefined) ?? null,
    };
  });
}

/** Removes a mark; returns what it said, or null if there was none. */
export async function clearResult(
  userId: string,
  examType: ExamType,
): Promise<LicensingOutcome | null> {
  const key = { userId, examType };
  return prisma.$transaction(async (tx) => {
    const previous = await tx.examResult.findUnique({
      where: { userId_examType: key },
      select: { outcome: true },
    });
    if (previous) {
      // deleteMany: a clear racing this one may have removed it already.
      await tx.examResult.deleteMany({ where: key });
    }
    return (previous?.outcome as LicensingOutcome | undefined) ?? null;
  });
}
