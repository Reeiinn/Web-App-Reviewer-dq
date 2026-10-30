import { z } from "zod";
import type { Actor } from "@/lib/helper/licensing";

/**
 * Who may remove which reviewee from the console.
 *
 * One rule for the single removal and for a ticked selection, so the two can
 * never disagree about who is allowed: only reviewee accounts, never the
 * caller's own, and a Unit Manager only their own recruits.
 */

export type RemovalTarget = {
  id: string;
  name: string;
  email: string;
  role: string;
  managerId: string | null;
};

const GONE = "That reviewee no longer exists.";

export function removalDecision(
  actor: Actor,
  targetId: string,
  target: RemovalTarget | undefined,
): { ok: true } | { ok: false; status: 400 | 403 | 404; reason: string } {
  if (targetId === actor.id) {
    return {
      ok: false,
      status: 400,
      reason: "You cannot remove your own account.",
    };
  }
  if (!target) return { ok: false, status: 404, reason: GONE };
  if (target.role !== "USER") {
    return {
      ok: false,
      status: 403,
      reason: "Only reviewee accounts can be removed here.",
    };
  }
  if (actor.role === "MANAGER" && target.managerId !== actor.id) {
    return {
      ok: false,
      status: 403,
      reason: "You can only remove reviewees you manage.",
    };
  }
  return { ok: true };
}

/** The most ids one request carries. The console sends more in batches. */
export const REMOVE_BATCH_SIZE = 200;

export const removeIdsSchema = z.object({
  ids: z.array(z.string()).min(1).max(REMOVE_BATCH_SIZE),
});

/** What a refused selection is told; the console batches, so a script hits this. */
export const removeIdsError = (error: z.ZodError) =>
  error.issues[0]?.code === "too_big"
    ? `Remove at most ${REMOVE_BATCH_SIZE} reviewees at a time.`
    : "Select at least one reviewee to remove.";

/**
 * Whether the removal dialog stays up after a run. It closes only on a clean
 * finish: anything skipped, or a batch that failed, has to stay on screen.
 */
export const removalLeftWork = (skipped: number, failed: boolean) =>
  skipped > 0 || failed;

/** An id that could name an account; anything else names nobody. */
export const isUuid = (value: string) => z.guid().safeParse(value).success;

/**
 * Splits a selection into the accounts to remove and the ones to report back.
 *
 * A selection is removed as far as it may be rather than refused whole: one
 * account the caller cannot touch is no reason to keep the rest, but each one
 * left behind is named with why, so nothing is skipped silently.
 */
export function planRemoval(
  actor: Actor,
  ids: readonly string[],
  targets: ReadonlyMap<string, RemovalTarget>,
): {
  remove: RemovalTarget[];
  skipped: { id: string; name?: string; reason: string }[];
} {
  const remove: RemovalTarget[] = [];
  const skipped: { id: string; name?: string; reason: string }[] = [];

  for (const id of new Set(ids)) {
    const target = isUuid(id) ? targets.get(id) : undefined;
    const decision = removalDecision(actor, id, target);
    if (decision.ok && target) remove.push(target);
    else if (!decision.ok) {
      skipped.push(
        target
          ? { id, name: target.name, reason: decision.reason }
          : { id, reason: decision.reason },
      );
    }
  }

  return { remove, skipped };
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    batches.push(items.slice(start, start + size));
  }
  return batches;
}
