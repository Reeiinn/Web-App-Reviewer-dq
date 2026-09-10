"use client";

import { Check, Copy, UserPlus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useSession } from "next-auth/react";
import { useState } from "react";

export function Invite() {
  const { data: session } = useSession();
  const [link, setLink] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "MANAGER") return null;

  async function generate() {
    setError("");
    setCopied(false);
    setIsCreating(true);

    try {
      const response = await fetch("/api/invites", { method: "POST" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Unable to create an invitation link.");
        return;
      }

      // The server builds the link on the app's canonical address. Pasting
      // together window.location.origin instead handed out whatever host this
      // browser happened to be on — a localhost link from a dev session, a
      // one-off deployment address from a preview build.
      if (!data.link) {
        setError(
          "The invitation was created without a link. Please try again.",
        );
        return;
      }

      setLink(data.link);
      setExpiresAt(new Date(data.expires_at).toLocaleDateString());
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsCreating(false);
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
    <section className="rv-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">Invite a reviewee</h2>
        <UserPlus className="size-5 text-[#C98A00]" />
      </div>

      <p className="mt-1.5 text-sm text-muted-foreground">
        Share a signup link so a new account is created under you. Each link
        works for one signup only and expires after 7 days.
      </p>

      {link && (
        <div className="mt-4 rounded-lg bg-muted p-4">
          <p className="break-all font-mono text-xs">{link}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              One use · expires {expiresAt}
            </span>
            <button
              onClick={copy}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold transition hover:border-[#C9A227]"
            >
              {copied ? (
                <Check className="size-3.5 text-emerald-600" />
              ) : (
                <Copy className="size-3.5" />
              )}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-4 text-sm font-semibold text-destructive" role="alert">
          {error}
        </p>
      )}

      <button
        onClick={generate}
        aria-busy={isCreating}
        disabled={isCreating}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#FFD400] px-4 py-3 text-sm font-bold text-[#0B2340] transition hover:bg-[#E8C200] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isCreating && <Spinner />}
        {link ? "Generate a new link" : "Generate invitation link"}
      </button>
    </section>
  );
}
