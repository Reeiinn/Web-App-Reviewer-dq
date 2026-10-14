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
export type AdminAction = "reviewee.removed" | "reviewee.restored";

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
