export type PresenceStatus = "ACTIVE" | "IDLE" | "INACTIVE";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** A visit inside this window counts as "they were in the app today". */
export const ACTIVE_WINDOW_MS = DAY;

/** Past this, a visit is old enough that the account reads as dormant. */
export const IDLE_WINDOW_MS = 7 * DAY;

export const presenceLabels: Record<PresenceStatus, string> = {
  ACTIVE: "Active today",
  IDLE: "Active this week",
  INACTIVE: "Inactive",
};

/** Tailwind classes for each presence pill, matching the roster status pills. */
export const presenceStyles: Record<PresenceStatus, string> = {
  ACTIVE: "border-emerald-300 bg-emerald-50 text-emerald-700",
  IDLE: "border-amber-300 bg-amber-50 text-amber-700",
  INACTIVE: "border-slate-300 bg-slate-50 text-slate-700",
};

/**
 * How recently a staff account last opened the app.
 *
 * The stamp behind this is written when a request comes in, so it says the
 * account loaded a screen — not that anyone is looking at one now. The buckets
 * are deliberately coarse for that reason: a day either side of the truth
 * changes nothing about "did they open it today", whereas a minute-level
 * reading would invite the screen to be read as live presence, which it is not.
 */
export function presenceStatus(
  lastSeenAt: string | null,
  now: number = Date.now(),
): PresenceStatus {
  if (!lastSeenAt) return "INACTIVE";

  const seen = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seen)) return "INACTIVE";

  // A row written by a database clock a little ahead of this one is the
  // freshest visit there is, not the stalest.
  const since = Math.max(0, now - seen);

  if (since < ACTIVE_WINDOW_MS) return "ACTIVE";
  if (since < IDLE_WINDOW_MS) return "IDLE";
  return "INACTIVE";
}
