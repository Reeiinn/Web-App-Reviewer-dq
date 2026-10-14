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
