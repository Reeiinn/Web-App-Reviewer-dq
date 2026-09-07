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

/**
 * What a staff account is called on screen.
 *
 * The role column stays ADMIN and MANAGER — sessions, the roster API and the
 * migrations all read those — but neither word is what the business calls the
 * job, so every label a user reads goes through here instead of spelling the
 * enum out.
 */
export const staffTitleFor = (role?: string | null) => {
  if (role === "ADMIN") return "Sales Manager";
  if (role === "MANAGER") return "Field Manager";
  return null;
};

/** The screen an account should land on after signing in. */
export const landingFor = (role?: string | null) =>
  isStaff(role) ? "/admin" : "/dashboard";
