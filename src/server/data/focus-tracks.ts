import "server-only";
import prisma from "@/server/db/prisma";
import { resolveFocusTracks, type FocusTracks } from "@/lib/helper/focus-tracks";
import type { ExamType } from "@/lib/types/common";

/** The tracks one user's summaries cover. */
export async function getFocusTracks(userId: string): Promise<FocusTracks> {
  const rows = await prisma.userFocusTrack.findMany({
    where: { userId },
    select: { examType: true },
  });
  return resolveFocusTracks(rows.map((row) => row.examType));
}

/** The same for many users in one query, for the roster. */
export async function getFocusTracksFor(
  userIds: string[],
): Promise<Map<string, FocusTracks>> {
  if (userIds.length === 0) return new Map();

  const rows = await prisma.userFocusTrack.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, examType: true },
  });
  const saved = new Map<string, string[]>();
  for (const row of rows) {
    saved.set(row.userId, [...(saved.get(row.userId) ?? []), row.examType]);
  }
  return new Map(
    userIds.map((id) => [id, resolveFocusTracks(saved.get(id) ?? [])]),
  );
}

/**
 * Replaces a user's pick. One transaction, so a failure leaves the old pick
 * in place: an empty set would otherwise read as "all four" without anyone
 * having chosen it. Callers validate with focusTracksBody first.
 */
export async function setFocusTracks(
  userId: string,
  tracks: ExamType[],
): Promise<FocusTracks> {
  await prisma.$transaction([
    prisma.userFocusTrack.deleteMany({ where: { userId } }),
    prisma.userFocusTrack.createMany({
      data: tracks.map((examType) => ({ userId, examType })),
    }),
  ]);
  return resolveFocusTracks(tracks);
}
