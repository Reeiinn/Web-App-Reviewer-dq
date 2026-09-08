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
    message: "Your practice exam is open. Take a sitting this week.",
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
  | { ok: true; message: string }
  | { ok: false; error: string };

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
