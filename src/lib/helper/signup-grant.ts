import { createHmac, timingSafeEqual } from "crypto";

/**
 * Proof that this server has just created this account.
 *
 * Signing up ends in an automatic sign-in, and the credentials provider demands
 * a Turnstile token from everything that reaches it. The signup form had none
 * to give — the widget is on the login screen — so `signIn` was called without
 * one, `authorize` refused it on the spot, and every new account was met with
 * "Signup succeeded, but automatic login failed. Please log in manually." The
 * automatic sign-in had never once worked.
 *
 * Registration issues a grant instead. It stands in for the bot check on that
 * one sign-in and on nothing else: it names the address it was minted for, it
 * expires in two minutes, and it is only ever issued after an invite code has
 * been spent — which is itself single-use. The password is still checked, so
 * the grant lets nobody in who could not already sign in by typing.
 *
 * The HMAC is over AUTH_SECRET, the same secret Auth.js signs sessions with, so
 * a grant cannot be minted anywhere but here.
 */

/** Long enough to survive a slow signup POST, short enough to be worthless later. */
export const SIGNUP_GRANT_TTL_MS = 2 * 60 * 1000;

const secret = () => process.env.AUTH_SECRET ?? "";

const sign = (payload: string) =>
  createHmac("sha256", secret()).update(payload).digest("hex");

/** `<expiry>.<signature>`, bound to the address it was issued for. */
export function createSignupGrant(
  email: string,
  now: number = Date.now(),
): string {
  const expiresAt = now + SIGNUP_GRANT_TTL_MS;
  return `${expiresAt}.${sign(`${email.toLowerCase()}|${expiresAt}`)}`;
}

export function isValidSignupGrant(
  grant: string | undefined | null,
  email: string,
  now: number = Date.now(),
): boolean {
  // No secret means no grant is trustworthy, so none is accepted.
  if (!grant || !secret()) return false;

  const [expiry, signature] = grant.split(".");
  const expiresAt = Number(expiry);

  if (!signature || !Number.isFinite(expiresAt) || expiresAt <= now) {
    return false;
  }

  const expected = sign(`${email.toLowerCase()}|${expiresAt}`);
  if (expected.length !== signature.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
