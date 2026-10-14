"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { DialogPanel } from "@/components/ui/dialog-panel";
import { Check, Copy, UserPlus } from "lucide-react";
import { useState } from "react";

/**
 * Appoints a Unit Manager by email.
 *
 * The invite is bound to the address it is sent to, so the link cannot be
 * forwarded into a promotion. Only the Sales Manager sees this button, and the
 * API refuses the role to anyone else regardless.
 *
 * A mailer may not be configured — the app has run without one since it was
 * built — so when the send does not happen the link comes back for the Sales
 * Manager to pass on by hand rather than the invitation being lost.
 */
export function InviteFieldManager({ onInvited }: { onInvited?: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const [sent, setSent] = useState(false);
  /** Why the mail didn't go out, when it didn't. Undefined once it did. */
  const [failReason, setFailReason] = useState<string | undefined>();
  const [copied, setCopied] = useState(false);

  const trimmed = email.trim();

  function close(next: boolean) {
    if (sending) return;
    setOpen(next);
    if (!next) {
      setEmail("");
      setError("");
      setLink("");
      setSent(false);
      setFailReason(undefined);
      setCopied(false);
    }
  }

  async function invite() {
    if (!trimmed || sending) return;

    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "MANAGER", email: trimmed }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not create this invitation.");
        setSending(false);
        return;
      }

      setSent(Boolean(data.sent));
      setFailReason(data.sent ? undefined : data.reason);
      setLink(data.link ?? "");
      setSending(false);
      onInvited?.();
    } catch {
      setError("Could not reach the server.");
      setSending(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setError("Copying failed — select the link and copy it manually.");
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={close}>
      <AlertDialog.Trigger className="rv-press flex items-center gap-2 rounded-lg bg-[#0B2340] px-3 py-2 text-sm font-bold text-white hover:bg-[#0F2E4D]">
        <UserPlus className="size-4" />
        Add Unit Manager
      </AlertDialog.Trigger>

      <AlertDialog.Portal>
        <DialogPanel animated>
          <AlertDialog.Title className="text-lg font-extrabold">
            Add a Unit Manager
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-1 text-sm text-muted-foreground">
            They get a signup link for a Unit Manager account. It works once,
            only from this address, and expires in 7 days.
          </AlertDialog.Description>

          <label
            htmlFor="field-manager-email"
            className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-muted-foreground"
          >
            Email address
          </label>
          <input
            id="field-manager-email"
            type="email"
            value={email}
            disabled={sending || Boolean(link)}
            placeholder="name@example.com"
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") invite();
            }}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#C9A227] disabled:opacity-60"
          />

          {link && (
            <div className="mt-4 rounded-xl border border-border bg-muted p-3">
              <p className="text-sm font-bold">
                {sent
                  ? `Invitation emailed to ${trimmed}.`
                  : "Invitation created, but no email was sent."}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {sent
                  ? "The link below is the same one they received."
                  : failReason === "not-configured"
                    ? "No mailer is configured. Send them this link yourself."
                    : "The email could not be sent — the sending domain may still be verifying, or Resend rejected it. Send them this link yourself."}
              </p>

              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-background px-2 py-1.5 text-xs">
                  {link}
                </code>
                <button
                  type="button"
                  onClick={copy}
                  aria-label="Copy the invitation link"
                  className="shrink-0 rounded-lg border border-border p-1.5 text-muted-foreground transition hover:border-[#C9A227] hover:text-[#0B2340]"
                >
                  {copied ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="mt-3 text-sm font-semibold text-rose-700"
            >
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Close
              disabled={sending}
              className="rounded-lg border border-border px-3 py-2 text-sm font-bold transition hover:border-[#C9A227] disabled:opacity-60"
            >
              {link ? "Done" : "Cancel"}
            </AlertDialog.Close>
            {!link && (
              <button
                type="button"
                aria-busy={sending}
                disabled={sending || !trimmed}
                onClick={invite}
                className="flex items-center gap-2 rounded-lg bg-[#0B2340] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#0F2E4D] disabled:opacity-40"
              >
                {sending && <Spinner />}
                {sending ? "Sending…" : "Send invitation"}
              </button>
            )}
          </div>
        </DialogPanel>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
