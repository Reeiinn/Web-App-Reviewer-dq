/**
 * How a field manager is measured on the Sales Manager's console.
 *
 * A field manager does not study, so none of the readiness maths that scores a
 * reviewee applies to them. What they are accountable for is recruiting, and
 * the console ranks them on exactly that: the count of reviewees who signed up
 * through their invite. Their last visit rides alongside the count rather than
 * inside it — opening the app is not an achievement, and a manager who
 * recruited fourteen people and then went quiet for a week has still recruited
 * fourteen people.
 */

/**
 * The recruit count the progress ring reads as full.
 *
 * This shapes the ring and nothing else: the number drawn inside it is the raw
 * count, and the ranking sorts on that count too. Setting the target wrong
 * therefore costs a misleading circle, never a wrong order.
 */
export const RECRUIT_TARGET = 10;

/** How full one manager's ring is drawn, as a percentage of the target. */
export function recruitProgress(recruits: number): number {
  if (recruits <= 0) return 0;
  return Math.round(Math.min(recruits / RECRUIT_TARGET, 1) * 100);
}

/**
 * How long ago the account last opened the app, in the roster's phrasing.
 *
 * Deliberately coarser than the timestamp behind it: last_seen_at is stamped
 * when a screen loads, so it marks an arrival rather than a session, and a
 * reading finer than "40m ago" would invite the card to be read as live
 * presence, which it is not.
 */
export function lastSeenLabel(
  lastSeenAt: string | null,
  now: number = Date.now(),
): string {
  if (!lastSeenAt) return "Never";

  const seen = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seen)) return "Never";

  // A row written by a database clock a little ahead of this one is the
  // freshest visit there is, not a visit that has not happened yet.
  const since = Math.max(0, now - seen);

  const minutes = Math.round(since / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.round(hours / 24)}d ago`;
}

/** The least a row needs before it can be placed in the ranking. */
type Rankable = {
  name: string;
  recruits: number;
  /** ISO timestamp, null for an account that has never opened the app. */
  lastSeenAt: string | null;
};

const seenAt = (lastSeenAt: string | null) => {
  if (!lastSeenAt) return 0;
  const time = new Date(lastSeenAt).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/**
 * The console's running order: most recruits first.
 *
 * A draw falls to whoever opened the app most recently, and then to the name,
 * so two managers on the same count never trade places between loads. A
 * manager who has recruited nobody still gets a card and a rank — that they
 * have recruited nobody is the fact worth seeing, and hiding the row would
 * hide it.
 */
export function rankFieldManagers<T extends Rankable>(
  managers: readonly T[],
): (T & { rank: number })[] {
  return [...managers]
    .sort((a, b) => {
      if (a.recruits !== b.recruits) return b.recruits - a.recruits;

      const seen = seenAt(b.lastSeenAt) - seenAt(a.lastSeenAt);
      if (seen !== 0) return seen;

      return a.name.localeCompare(b.name);
    })
    .map((manager, index) => ({ ...manager, rank: index + 1 }));
}
