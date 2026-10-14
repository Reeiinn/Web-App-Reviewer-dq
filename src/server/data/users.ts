import "server-only";
import prisma from "@/server/db/prisma";

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

export type SignInAccount = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  managerId: string | null;
  onboardingToursSeen: string[];
};

/** The account behind a sign-in attempt. `email` is already normalised. */
export async function findSignInAccount(
  email: string,
): Promise<SignInAccount | null> {
  return prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: {
      id: true,
      email: true,
      password: true,
      name: true,
      role: true,
      managerId: true,
      onboardingToursSeen: true,
    },
  });
}

export type SessionClaims = {
  role: Role;
  managerId: string | null;
  onboardingToursSeen: string[];
};

/** What a session may claim right now; null once the account is gone. */
export async function getSessionClaims(
  userId: string,
): Promise<SessionClaims | null> {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { role: true, managerId: true, onboardingToursSeen: true },
  });
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
  });
}
