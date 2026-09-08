"use client";

import { nudgeAge } from "@/lib/helper/nudges";
import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Nudge = {
  id: string;
  sender: string;
  message: string;
  createdAt: string;
  read: boolean;
};

/**
 * Where a reviewee reads the reminders their manager sent.
 *
 * It refetches on mount and whenever the path changes rather than polling: a
 * reminder is not urgent enough to keep a timer alive for, and a reviewee
 * moving between screens picks it up within a click. Opening the list is what
 * marks it read — there is nothing to reply to, so arriving is the whole
 * interaction.
 */
export function NotificationBell() {
  const pathname = usePathname();
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;

    async function load() {
      try {
        const response = await fetch("/api/nudges");
        if (!response.ok) return;
        const data = await response.json();
        if (!live) return;
        setNudges(data.nudges ?? []);
        setUnread(data.unread ?? 0);
      } catch {
        // A bell that cannot load is a bell with no dot; nothing to report.
      } finally {
        if (live) setLoaded(true);
      }
    }

    load();
    return () => {
      live = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);

    if (!next || unread === 0) return;

    // The dot clears on the press rather than on the response: the reviewee
    // is looking at the list either way, and a dot that lingers reads as a
    // reminder they have not seen.
    setUnread(0);
    setNudges((current) => current.map((item) => ({ ...item, read: true })));

    try {
      await fetch("/api/nudges", { method: "PATCH" });
    } catch {
      // Left unread server-side; the next load restores the dot.
    }
  }

  return (
    <div className="relative" ref={container}>
      <button
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        className="relative flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-[#0B2340] hover:text-[#0B2340]"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-[#E11D48] px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="rv-pop-in absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        >
          <p className="border-b border-border px-4 py-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Reminders
          </p>

          {nudges.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {loaded ? "Nothing from your manager yet." : "Loading…"}
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {nudges.map((nudge) => (
                <li
                  key={nudge.id}
                  className="border-b border-border px-4 py-3 last:border-b-0"
                >
                  <p className="text-sm">{nudge.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {nudge.sender} · {nudgeAge(nudge.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
