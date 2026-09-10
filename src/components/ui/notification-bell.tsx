"use client";

import { cachedFetch, invalidateCached } from "@/lib/helper/client-cache";
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

type NudgeFeed = { nudges?: Nudge[]; unread?: number };

/** The reminders, held for the tab so moving between screens is not a refetch. */
const NUDGES_CACHE_KEY = "user:nudges";
const NUDGES_TTL_MS = 60_000;

/**
 * Where a reviewee reads the reminders their manager sent.
 *
 * It reads on mount and on a path change rather than polling: a reminder is not
 * urgent enough to keep a timer alive for, and a reviewee moving between
 * screens picks it up within a click. The answer is held for a minute, so a run
 * through four screens is one request rather than four. Unread reminders stay
 * tinted until the reviewee marks them read: opening the bell to look is not
 * the same as dealing with what is in it.
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
        const data = await cachedFetch<NudgeFeed>(
          NUDGES_CACHE_KEY,
          async () => {
            const response = await fetch("/api/nudges");
            if (!response.ok) throw new Error("nudges unavailable");
            return (await response.json()) as NudgeFeed;
          },
          NUDGES_TTL_MS,
        );

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

  /**
   * Marking read is the reviewee's own press, not a side effect of opening the
   * bell: a reminder they have glanced at and left is one they mean to come
   * back to, and clearing it for them loses that.
   */
  async function markRead(id?: string) {
    setNudges((current) =>
      current.map((item) =>
        !id || item.id === id ? { ...item, read: true } : item,
      ),
    );
    setUnread((current) => (id ? Math.max(0, current - 1) : 0));

    try {
      const response = await fetch("/api/nudges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { id } : {}),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && typeof data?.unread === "number")
        setUnread(data.unread);

      // What the cache holds is now behind what the reviewee has just done, so
      // the next screen reads it again rather than redrawing an old dot.
      invalidateCached(NUDGES_CACHE_KEY);
    } catch {
      // The optimistic state stands; the next load corrects it either way.
    }
  }

  return (
    <div ref={container}>
      <button
        onClick={() => setOpen((current) => !current)}
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
          // `right-0` here is the nav cluster's right edge — the page gutter —
          // rather than the bell's, which sits an avatar and a gap short of it.
          // Anchored to the bell, a 20rem panel ran off the left of the screen
          // on any viewport under 384px, which is most phones, and left
          // overflow is not something the browser lets you scroll back to.
          className="rv-pop-in absolute right-0 top-11 z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Reminders
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markRead()}
                className="text-[11px] font-bold uppercase tracking-wide text-[#0B2340] transition hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {nudges.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {loaded ? "Nothing from your manager yet." : "Loading…"}
            </p>
          ) : (
            // `dvh` rather than a fixed cap: a phone held sideways has less height
            // than the list wants, and the browser's collapsing address bar
            // moves the number.
            <ul className="max-h-[min(20rem,60dvh)] overflow-y-auto">
              {nudges.map((nudge) => (
                <li
                  key={nudge.id}
                  className={`border-b border-border px-4 py-3 last:border-b-0 ${
                    nudge.read ? "" : "bg-[#FFF8D6]"
                  }`}
                >
                  <p className="text-sm">{nudge.message}</p>
                  <div className="mt-1 flex items-baseline justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {nudge.sender} · {nudgeAge(nudge.createdAt)}
                    </p>
                    {!nudge.read && (
                      <button
                        type="button"
                        onClick={() => markRead(nudge.id)}
                        className="shrink-0 text-xs font-bold text-[#0B2340] transition hover:underline"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
