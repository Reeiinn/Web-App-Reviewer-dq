import "server-only";
import prisma from "@/server/db/prisma";
import type { ExamPick } from "@/lib/helper/exam-choice";
import { resolveFocusTracks } from "@/lib/helper/focus-tracks";
import { Prisma } from "@/generated/prisma/client";
import {
  claimantMatches,
  isInviteRole,
  managerForInvite,
  type InviteRole,
} from "@/lib/helper/invites";

/**
 * Accounts: who may sign in, what their session claims, their photo and
 * tours, password resets, invitations and registration. Every query on
 * users, password_reset_tokens and registration_invites goes through here.
 *
 * "Active" means deleted_at IS NULL. Removing someone from the console is a
 * soft delete, and every read that decides what an account may do filters on
 * it.
 */

export type Role = "USER" | "MANAGER" | "ADMIN";

/**
 * How long an interactive transaction may wait for a connection, and run.
 * Prisma's default wait is 2s; the pg pool these flows used waited up to
 * connectionTimeoutMillis (10s), so a signup or reset during a burst queued
 * rather than failing with a 500.
 */
const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 10_000 };

export type SignInAccount = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  managerId: string | null;
  onboardingToursSeen: string[];
  /** The exams they picked, null until they have picked (see exam-choice). */
  focusTracks: ExamPick;
};

const focusSelect = { focusTracks: { select: { examType: true } } } as const;

/**
 * Saved focus rows to the pick a session carries. Unlike resolveFocusTracks,
 * nothing saved stays null: the session has to know a reviewee was never
 * asked, not just which tracks to show.
 */
const asPick = (rows: { examType: string }[]): ExamPick => {
  const resolved = resolveFocusTracks(rows.map((row) => row.examType));
  return resolved.chosen ? resolved.tracks : null;
};

/** The account behind a sign-in attempt. `email` is already normalised. */
export async function findSignInAccount(
  email: string,
): Promise<SignInAccount | null> {
  const row = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: {
      id: true,
      email: true,
      password: true,
      name: true,
      role: true,
      managerId: true,
      onboardingToursSeen: true,
      ...focusSelect,
    },
  });
  return row && { ...row, focusTracks: asPick(row.focusTracks) };
}

export type SessionClaims = {
  role: Role;
  managerId: string | null;
  onboardingToursSeen: string[];
  focusTracks: ExamPick;
};

/** What a session may claim right now; null once the account is gone. */
export async function getSessionClaims(
  userId: string,
): Promise<SessionClaims | null> {
  const row = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { role: true, managerId: true, onboardingToursSeen: true, ...focusSelect },
  });
  return row && { ...row, focusTracks: asPick(row.focusTracks) };
}

/** The account's photo, a data URL; null if none or the account is gone. */
export async function getAvatar(userId: string): Promise<string | null> {
  const row = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { image: true },
  });
  return row?.image ?? null;
}

/** Sets or (with null) clears the photo. */
export async function setAvatar(
  userId: string,
  image: string | null,
): Promise<void> {
  await prisma.user.updateMany({ where: { id: userId }, data: { image } });
}

/**
 * Adds the role to the tours this account has seen, unless it is already
 * there. The condition is in the WHERE, so two tabs finishing the tour at
 * once still record it once.
 */
export async function markTourSeen(userId: string, role: Role): Promise<void> {
  await prisma.user.updateMany({
    where: { id: userId, NOT: { onboardingToursSeen: { has: role } } },
    data: { onboardingToursSeen: { push: role } },
  });
}

/** The id of the active account with this (normalised) address. */
export async function findActiveUserId(email: string): Promise<string | null> {
  const row = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true },
  });
  return row?.id ?? null;
}

/**
 * Records a new reset link. Every earlier link for the account stops working
 * in the same transaction, so a forwarded old email cannot be replayed.
 */
export async function issueResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    }),
  ]);
}

export type ResetTokenRecord = {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export async function findResetToken(
  tokenHash: string,
): Promise<ResetTokenRecord | null> {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
}

/**
 * Spends the link and sets the password, both or neither. The link is spent
 * conditionally, so two submissions of the same one cannot both succeed:
 * false means it was already used or has expired, and nothing changed.
 */
export async function resetPassword(
  tokenId: string,
  userId: string,
  passwordHash: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const spent = await tx.passwordResetToken.updateMany({
      where: { id: tokenId, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (spent.count === 0) return false;

    await tx.user.updateMany({
      where: { id: userId },
      data: { password: passwordHash },
    });
    return true;
  }, TRANSACTION_OPTIONS);
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CreatedInvite = {
  code: string;
  expiresAt: Date;
  role: Role;
  email: string | null;
};

/**
 * Records a signup link that lasts seven days. A second invite to the same
 * address replaces the first in the same transaction, so an address never
 * holds two live links to spend.
 */
export async function createInvite(input: {
  code: string;
  createdBy: string;
  role: InviteRole;
  email: string | null;
}): Promise<CreatedInvite> {
  // Not awaited here: a Prisma query runs only when it is awaited or handed
  // to $transaction, so an open link runs it on its own and an addressed one
  // runs it inside the transaction below. Awaiting it first would insert the
  // invite outside the transaction, before the old one is replaced.
  const create = prisma.registrationInvite.create({
    data: { ...input, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
    select: { code: true, expiresAt: true, role: true, email: true },
  });
  if (!input.email) return create;

  const [, invite] = await prisma.$transaction([
    prisma.registrationInvite.updateMany({
      where: { email: input.email, usedAt: null },
      data: { usedAt: new Date() },
    }),
    create,
  ]);
  return invite;
}

export type RegisteredUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  managerId: string | null;
  createdAt: Date;
};

export type RegisterOutcome =
  | { ok: true; user: RegisteredUser }
  | { ok: false; reason: "invite"; error: string }
  | { ok: false; reason: "claimant"; error: string }
  | { ok: false; reason: "email-taken" };

/** Thrown inside the transaction to undo the claim and answer with `outcome`. */
class Refused extends Error {
  constructor(readonly outcome: RegisterOutcome) {
    super("registration refused");
  }
}

async function explainUnusableInvite(
  tx: Prisma.TransactionClient,
  code: string,
): Promise<string> {
  const invite = await tx.registrationInvite.findUnique({
    where: { code },
    select: { usedAt: true },
  });
  if (!invite) return "This invitation code is not valid.";
  if (invite.usedAt) return "This invitation link has already been used.";
  return "This invitation link has expired.";
}

/**
 * Spends the invite and creates the account, both or neither. Claiming in the
 * same transaction means a link can never be spent twice, and any refusal —
 * someone else's addressed invite, an address already registered — releases
 * it instead of burning it. `email` and `name` arrive normalised.
 *
 * users.email stays unique across removed accounts, so a removed reviewee
 * comes back on that same account, with their work, on the new password and
 * under whoever invited them. Only an invite addressed to them does this: staff
 * named that person, whereas an open link proves nothing about who is typing
 * the address, and would hand a stranger the old account.
 */
export async function registerWithInvite(input: {
  code: string;
  email: string;
  name: string;
  passwordHash: string;
}): Promise<RegisterOutcome> {
  try {
    return await prisma.$transaction(async (tx) => {
      const now = new Date();
      const [invite] = await tx.registrationInvite.updateManyAndReturn({
        where: { code: input.code, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
        select: { createdBy: true, role: true, email: true },
      });

      if (!invite) {
        throw new Refused({
          ok: false,
          reason: "invite",
          error: await explainUnusableInvite(tx, input.code),
        });
      }

      const claimant = claimantMatches(invite.email, input.email);
      if (!claimant.ok) {
        throw new Refused({ ok: false, reason: "claimant", error: claimant.error });
      }

      const role: InviteRole = isInviteRole(invite.role) ? invite.role : "USER";
      const account = {
        password: input.passwordHash,
        name: input.name,
        role,
        managerId: managerForInvite(role, invite.createdBy),
      };
      const select = {
        id: true,
        email: true,
        name: true,
        role: true,
        managerId: true,
        createdAt: true,
      };

      const removedAccount = { email: input.email, deletedAt: { not: null } };

      if (!invite.email && (await tx.user.count({ where: removedAccount })) > 0) {
        throw new Refused({
          ok: false,
          reason: "claimant",
          error:
            "This email belongs to a removed account. Ask your manager to send an invitation to it.",
        });
      }

      const [restored] = await tx.user.updateManyAndReturn({
        where: removedAccount,
        data: { ...account, deletedAt: null },
        select,
      });

      if (restored) {
        // A reset link from before the removal must not outlive the new password.
        await tx.passwordResetToken.updateMany({
          where: { userId: restored.id, usedAt: null },
          data: { usedAt: now },
        });
        // A removed account coming back is left on the record for support.
        await tx.adminAction.create({
          data: {
            actorId: restored.id,
            actorEmail: restored.email,
            actorRole: restored.role,
            action: "reviewee.restored",
            targetId: restored.id,
            targetEmail: restored.email,
            targetName: restored.name,
            detail: { via: "signup", invitedBy: invite.createdBy },
          },
        });
      }

      const user =
        restored ??
        (await tx.user.create({
          data: { email: input.email, ...account },
          select,
        }));

      return { ok: true as const, user };
    }, TRANSACTION_OPTIONS);
  } catch (error) {
    if (error instanceof Refused) return error.outcome;
    // unique_violation on users.email
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, reason: "email-taken" };
    }
    throw error;
  }
}

/** Whether userId is an active (not removed) recruit of managerId. */
export async function isActiveRecruit(
  userId: string,
  managerId: string,
): Promise<boolean> {
  return (
    (await prisma.user.count({
      where: { id: userId, managerId, deletedAt: null },
    })) > 0
  );
}
