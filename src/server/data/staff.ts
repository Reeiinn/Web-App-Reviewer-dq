import "server-only";
import prisma from "@/server/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Staff: the console's roster and managers list, removing a reviewee,
 * nudges, the audit log and presence stamps. Every query on nudges and
 * admin_actions, and every staff read of users, goes through here.
 */

/**
 * Records that a staff account just loaded a screen.
 *
 * The avatar lookup behind AppNav is what every screen calls on load, so
 * stamping from the routes the app already hits answers "did they open it"
 * without the browser having to ping anything. What it marks is arrival, not
 * presence: a screen left open all morning still reads as the single visit
 * that loaded it.
 *
 * Callers pass the signed-in account and nothing else, so this can only ever
 * stamp whoever made the request.
 */
export async function touchLastSeen(userId: string): Promise<void> {
  try {
    // updateMany: an id that matches nothing is a no-op, as the old UPDATE
    // was, rather than a P2025.
    await prisma.user.updateMany({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
  } catch (error) {
    // Presence is a nicety on somebody else's screen. Losing a stamp must not
    // cost the caller the roster they actually asked for.
    console.error("Error recording last seen:", error);
  }
}

/**
 * A record of what a staff account did to a learner's account.
 *
 * Removal used to leave nothing behind: the row was deleted, everything
 * cascaded, and the question "who removed this person, and when" had no answer
 * in the database. Actions are written here first, and the actor's and target's
 * details are copied in at the time so the record still reads years later,
 * after either account has gone.
 *
 * Writing a record must never be the reason an action fails, so a failure here
 * is logged and swallowed. It is a record, not a gate.
 */
export type AdminAction =
  | "reviewee.removed"
  | "reviewee.restored"
  | "reviewee.result_marked"
  | "reviewee.result_cleared";

export async function recordAdminAction(entry: {
  actor: { id: string; email: string; role: string };
  action: AdminAction;
  target: { id: string; email: string | null; name: string | null };
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.adminAction.create({
      data: {
        actorId: entry.actor.id,
        actorEmail: entry.actor.email,
        actorRole: entry.actor.role,
        action: entry.action,
        targetId: entry.target.id,
        targetEmail: entry.target.email,
        targetName: entry.target.name,
        detail: (entry.detail ?? {}) as Prisma.InputJsonObject,
      },
    });
  } catch (error) {
    console.error("Failed to record admin action:", entry.action, error);
  }
}

export type StaffRole = "USER" | "MANAGER" | "ADMIN";

export type RosterReviewee = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  manager: {
    id: string;
    name: string;
    email: string;
    role: StaffRole;
    image: string | null;
  } | null;
};

/**
 * Active reviewees for the roster, by name. recruitedBy null is everyone
 * (an admin's view); an id is that manager's own recruits. manager_id is set
 * at signup from the invite used, so it is the recruiter. The recruiter is
 * read even if since removed, as the old LEFT JOIN did.
 */
export async function listReviewees(
  recruitedBy: string | null,
): Promise<RosterReviewee[]> {
  return prisma.user.findMany({
    where: {
      role: "USER",
      deletedAt: null,
      ...(recruitedBy === null ? {} : { managerId: recruitedBy }),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      manager: {
        select: { id: true, name: true, email: true, role: true, image: true },
      },
    },
  });
}

export type ManagerActivity = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  lastSeenAt: Date | null;
  reviewees: number;
};

/**
 * Active unit managers, most recently seen first (never seen last, then by
 * name), each with how many active reviewees they recruited.
 */
export async function listManagers(): Promise<ManagerActivity[]> {
  const rows = await prisma.user.findMany({
    where: { role: "MANAGER", deletedAt: null },
    orderBy: [{ lastSeenAt: { sort: "desc", nulls: "last" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      lastSeenAt: true,
      _count: {
        select: { recruits: { where: { role: "USER", deletedAt: null } } },
      },
    },
  });
  return rows.map(({ _count, ...row }) => ({ ...row, reviewees: _count.recruits }));
}

export type StaffTarget = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  managerId: string | null;
};

/** The account a staff action is aimed at, or null if unknown or removed. */
export async function findActiveAccount(id: string): Promise<StaffTarget | null> {
  return prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, email: true, role: true, managerId: true },
  });
}

/**
 * Removes a reviewee: a soft delete that stamps deleted_at. Every read
 * filters on it, and their work stays, so they can be restored.
 *
 * True only if this call did the stamping. Of two removals racing, one gets
 * true; the caller writes the audit record only then.
 */
export async function removeReviewee(id: string): Promise<boolean> {
  const { count } = await prisma.user.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return count === 1;
}

export type NudgeRecord = {
  id: string;
  senderId: string | null;
  senderName: string;
  message: string;
  createdAt: Date;
  readAt: Date | null;
};

const nudgeSelect = {
  id: true,
  senderId: true,
  senderName: true,
  message: true,
  createdAt: true,
  readAt: true,
} as const;

/** When this sender last reminded this reviewee, for the cooldown. */
export async function lastNudgeSentAt(
  userId: string,
  senderId: string,
): Promise<Date | null> {
  const last = await prisma.nudge.findFirst({
    where: { userId, senderId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return last?.createdAt ?? null;
}

/** Writes one reminder. The row is the record that it was sent. */
export async function sendNudge(input: {
  userId: string;
  senderId: string;
  senderName: string;
  message: string;
}): Promise<NudgeRecord> {
  return prisma.nudge.create({ data: input, select: nudgeSelect });
}

/** A reviewee's reminders, newest first. */
export async function listNudges(userId: string, limit: number): Promise<NudgeRecord[]> {
  return prisma.nudge.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: nudgeSelect,
  });
}

/** One reminder, only if it was sent to userId. */
export async function findNudge(
  id: string,
  userId: string,
): Promise<{ id: string; senderId: string | null } | null> {
  return prisma.nudge.findFirst({
    where: { id, userId },
    select: { id: true, senderId: true },
  });
}

/** Takes a reminder back. Already gone is not an error. */
export async function deleteNudge(id: string): Promise<void> {
  await prisma.nudge.deleteMany({ where: { id } });
}

/** Unread reminders across every row, not just the ones a list returns. */
export async function unreadNudgeCount(userId: string): Promise<number> {
  return prisma.nudge.count({ where: { userId, readAt: null } });
}

/**
 * Marks reminders read: the one named, or all of them. Matched only inside
 * userId's own unread rows, so naming somebody else's touches nothing.
 */
export async function markNudgesRead(userId: string, id: string | null): Promise<void> {
  await prisma.nudge.updateMany({
    where: { userId, readAt: null, ...(id === null ? {} : { id }) },
    data: { readAt: new Date() },
  });
}
