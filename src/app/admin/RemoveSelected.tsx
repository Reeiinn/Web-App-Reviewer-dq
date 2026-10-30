"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { DialogPanel } from "@/components/ui/dialog-panel";
import { Spinner } from "@/components/ui/spinner";
import { REMOVE_BATCH_SIZE, chunk } from "@/lib/helper/removal";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";

type Skipped = { id: string; name?: string; reason: string };

/**
 * Removes every ticked reviewee behind one confirmation.
 *
 * This replaced a per-row dialog that wanted the person's full name typed and
 * a button held for two seconds, one account at a time, which the client found
 * too slow to use. The weight now sits in what the dialog shows: every name
 * about to go, listed, so the person confirming reads exactly who they are
 * removing before one plain Delete.
 */
export function RemoveSelected({
  reviewees,
  onRemoved,
}: {
  reviewees: { id: string; name: string }[];
  /** Called with whatever was removed, even when some of the selection was not. */
  onRemoved: (removedIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [skipped, setSkipped] = useState<Skipped[]>([]);
  const [error, setError] = useState("");

  const count = reviewees.length;

  function change(next: boolean) {
    if (removing) return; // never yank the dialog out from under a request
    setOpen(next);
    if (!next) {
      setSkipped([]);
      setError("");
    }
  }

  async function remove() {
    if (removing || count === 0) return;
    setRemoving(true);
    setError("");
    setSkipped([]);

    const removed: string[] = [];
    const left: Skipped[] = [];

    try {
      // One request carries at most a batch; a larger selection goes in turn
      // and is reported back as one outcome.
      for (const ids of chunk(
        reviewees.map((row) => row.id),
        REMOVE_BATCH_SIZE,
      )) {
        const response = await fetch("/api/admin/reviewees/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error ?? "Could not remove these accounts.");
        }
        removed.push(...(data.removed ?? []).map((row: { id: string }) => row.id));
        left.push(...(data.skipped ?? []));
      }
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Could not reach the server.",
      );
    } finally {
      setRemoving(false);
    }

    if (removed.length > 0) onRemoved(removed);

    // Whatever could not go stays ticked and stays on screen, with why.
    if (left.length > 0) {
      setSkipped(left);
    } else if (removed.length > 0) {
      setOpen(false);
    }
  }

  const nameFor = (row: Skipped) =>
    row.name ?? reviewees.find((item) => item.id === row.id)?.name ?? row.id;

  return (
    <AlertDialog.Root open={open} onOpenChange={change}>
      <AlertDialog.Trigger
        disabled={count === 0}
        className="ml-auto flex items-center gap-1.5 rounded-lg bg-[#B42318] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#9A1D14] disabled:opacity-60"
      >
        <Trash2 className="size-4" />
        Remove selected
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <DialogPanel animated>
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <AlertTriangle className="size-5" />
            </span>
            <div className="min-w-0">
              <AlertDialog.Title className="text-lg font-extrabold">
                {count === 1
                  ? "Are you sure you want to remove this account?"
                  : `Are you sure you want to remove these ${count} accounts?`}
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-1 text-sm text-muted-foreground">
                These reviewees will be removed from the roster and won&apos;t
                be able to sign in.
              </AlertDialog.Description>
            </div>
          </div>

          <ul className="mt-4 max-h-48 list-disc overflow-y-auto rounded-xl bg-muted py-3 pl-8 pr-4 text-sm font-bold">
            {reviewees.map((row) => (
              <li key={row.id} className="py-0.5">
                {row.name}
              </li>
            ))}
          </ul>

          {skipped.length > 0 && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
            >
              <p className="font-bold">
                {skipped.length === 1
                  ? "This account was not removed:"
                  : `These ${skipped.length} accounts were not removed:`}
              </p>
              <ul className="mt-1.5 space-y-1">
                {skipped.map((row) => (
                  <li key={row.id}>
                    <span className="font-semibold">{nameFor(row)}</span> —{" "}
                    {row.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 text-sm font-semibold text-destructive">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Close
              disabled={removing}
              className="rounded-lg border border-border px-3 py-2 text-sm font-bold transition hover:border-[#C9A227] disabled:opacity-60"
            >
              Cancel
            </AlertDialog.Close>
            <button
              type="button"
              onClick={remove}
              disabled={removing || count === 0}
              aria-busy={removing}
              className="flex items-center gap-2 rounded-lg bg-[#B42318] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#9A1D14] disabled:opacity-60"
            >
              {removing && <Spinner />}
              {removing
                ? "Removing…"
                : count === 1
                  ? "Delete"
                  : `Delete ${count} accounts`}
            </button>
          </div>
        </DialogPanel>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
