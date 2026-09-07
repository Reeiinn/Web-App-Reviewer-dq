/**
 * Who a signed-in account is, and where it belongs.
 *
 * Admins and managers oversee reviewees rather than study themselves. The
 * learner screens write progress, streaks and attempts against whoever is
 * signed in, so a manager working through a deck would build a learner record
 * for their own account — one that appears on no roster, since the roster only
 * lists users with role USER.
 */
export const isStaff = (role?: string | null) =>
  role === "ADMIN" || role === "MANAGER";

/** The screen an account should land on after signing in. */
export const landingFor = (role?: string | null) =>
  isStaff(role) ? "/admin" : "/dashboard";
