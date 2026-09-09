/**
 * Reminders a manager sends a reviewee from the roster.
 *
 * The preset phrases live here rather than in the popover because the API
 * resolves a preset id itself: what the client sends is which phrase, never
 * the words. A row then stores the resolved text, so editing this list later
 * changes what the next nudge says without rewriting what was already sent.
 */

export type NudgePreset = {
  id: string;
  /** The button's face in the popover — short enough to scan four of them. */
  label: string;
  message: string;
};

export const nudgePresets: readonly NudgePreset[] = [
  {
    id: "pending",
    label: "Pending reviews",
    message: "You have pending reviews waiting. Set aside 15 minutes today.",
  },
  {
    id: "flashcards",
    label: "Flashcards",
    message: "Your flashcards are due for a pass. Keep the streak alive.",
  },
  {
    id: "exam",
    label: "Practice exam",
    message: "Answer your practice exam. Take a sitting this week.",
  },
  {
    id: "behind",
    label: "Falling behind",
    message: "You have fallen behind schedule. Let us get you back on track.",
  },
];

/**
 * A nudge is read in a dropdown beside three others, so it stays short enough
 * to take in at a glance.
 */
export const NUDGE_MAX_LENGTH = 200;

export type NudgeInput = { preset?: unknown; message?: unknown };

export type NudgeResolution =
  { ok: true; message: string } | { ok: false; error: string };

/**
 * The text a nudge will carry, from what the client asked for.
 *
 * A preset id wins over any message sent alongside it: the two together mean
 * the manager pressed a preset button, and honouring the text instead would
 * send words the client chose under a name the server trusts. An unrecognised
 * id is an error rather than a fall-through to the custom message, so a typo
 * cannot quietly send something else.
 */
export function resolveNudge({ preset, message }: NudgeInput): NudgeResolution {
  if (preset !== undefined && preset !== null && preset !== "") {
    if (typeof preset !== "string") {
      return { ok: false, error: "That reminder is not one we have." };
    }

    const found = nudgePresets.find((item) => item.id === preset);
    return found
      ? { ok: true, message: found.message }
      : { ok: false, error: "That reminder is not one we have." };
  }

  if (typeof message !== "string") {
    return { ok: false, error: "Pick a reminder or write your own." };
  }

  const trimmed = message.trim();

  if (!trimmed) {
    return { ok: false, error: "Pick a reminder or write your own." };
  }

  if (trimmed.length > NUDGE_MAX_LENGTH) {
    return {
      ok: false,
      error: `Keep the reminder to ${NUDGE_MAX_LENGTH} characters or fewer.`,
    };
  }

  return { ok: true, message: trimmed };
}

export type NudgeTarget = { role: string; manager_id: string | null };

export type NudgeSender = { role: string; id: string };

/**
 * Whether this account may nudge that one.
 *
 * Staff receive no nudges — there is no bell on their navigation — so a nudge
 * aimed at one is refused rather than written to a row nobody will read. A
 * field manager reaches only their own reports, matching the roster they are
 * shown and the delete they are allowed.
 */
export function canNudge(
  sender: NudgeSender,
  target: NudgeTarget,
): NudgeResolution {
  if (sender.role !== "ADMIN" && sender.role !== "MANAGER") {
    return { ok: false, error: "Only managers can send reminders." };
  }

  if (target.role !== "USER") {
    return { ok: false, error: "Only reviewees can be sent a reminder." };
  }

  if (sender.role === "MANAGER" && target.manager_id !== sender.id) {
    return {
      ok: false,
      error: "You can only remind reviewees you manage.",
    };
  }

  return { ok: true, message: "" };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * How long one sender waits before reminding the same reviewee again.
 *
 * A reminder is worth reading because it is rare. Nothing stopped a manager
 * sending twenty in a minute, which turns the bell into something to be
 * dismissed unread — and, from the reviewee's side, into harassment they
 * cannot switch off. Four hours is long enough that a second reminder means a
 * second occasion, and short enough to chase somebody twice in a working day.
 */
export const NUDGE_COOLDOWN_MS = 4 * HOUR;

/** What to say when the wait is not over: hours where there are any, else minutes. */
export function nudgeCooldownMessage(
  name: string,
  msSinceLast: number,
  cooldownMs = NUDGE_COOLDOWN_MS,
): string {
  const remaining = Math.max(0, cooldownMs - msSinceLast);
  const hours = Math.floor(remaining / HOUR);
  const minutes = Math.max(1, Math.ceil((remaining % HOUR) / MINUTE));

  const wait =
    hours > 0
      ? `${hours} hour${hours === 1 ? "" : "s"}`
      : `${minutes} minute${minutes === 1 ? "" : "s"}`;

  return `You have already reminded ${name}. You can send another in about ${wait}.`;
}

/** Whether this sender has waited long enough to remind this reviewee again. */
export function nudgeAllowedAfter(
  msSinceLast: number | null,
  cooldownMs = NUDGE_COOLDOWN_MS,
): boolean {
  return msSinceLast === null || msSinceLast >= cooldownMs;
}

/**
 * How long ago a reminder arrived, for the line under it in the bell.
 *
 * Coarse on purpose: what a reviewee takes from the stamp is "this is new" or
 * "this has been sitting there", and a minute-level reading would invite the
 * list to be read as a conversation it cannot be.
 */
export function nudgeAge(sentAt: string, now: number = Date.now()) {
  const elapsed = now - new Date(sentAt).getTime();

  if (elapsed < MINUTE) return "Just now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`;
  return `${Math.floor(elapsed / DAY)}d ago`;
}

export type SentNudge = { sender_id: string | null };

/**
 * Whether this account may take back a reminder it can see.
 *
 * A field manager unsends their own only: two managers can share a reviewee
 * through a recruit and a reassignment, and one deleting the other's reminder
 * would be editing a conversation that is not theirs. The Sales Manager owns
 * the console outright and can clear any of them.
 */
export function canDeleteNudge(
  sender: NudgeSender,
  nudge: SentNudge,
): NudgeResolution {
  if (sender.role === "ADMIN") return { ok: true, message: "" };

  if (sender.role !== "MANAGER") {
    return { ok: false, error: "Only managers can delete reminders." };
  }

  return nudge.sender_id === sender.id
    ? { ok: true, message: "" }
    : { ok: false, error: "You can only delete reminders you sent." };
}
