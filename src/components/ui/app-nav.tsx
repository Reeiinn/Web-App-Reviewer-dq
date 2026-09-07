"use client";

import { isStaff, landingFor } from "@/lib/helper/roles";
import { LogOut, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Flashcards and Memorize are reached through a track on the dashboard, so
// they are deliberately not top-level links — a nav entry here would have had
// to guess a track.
//
// Staff get the console where a reviewee gets the dashboard: the study screens
// redirect them away, so linking there would only bounce.
const learnerLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/glossary", label: "Glossary" },
  { href: "/analytics", label: "Analytics" },
];

// No Analytics here: it charts the signed-in account's own per-track mastery,
// which is empty for staff since they do not study. Reviewee performance is
// what the console is for.
const staffLinks = [
  { href: "/admin", label: "Admin Console" },
  { href: "/glossary", label: "Glossary" },
];

function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  const name = session?.user?.name ?? "Scholar";
  const email = session?.user?.email ?? "";
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

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

  return (
    <div className="relative" ref={container}>
      <button
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open user menu"
        className="flex size-9 items-center justify-center rounded-full border border-border bg-[#0B2340] text-xs font-bold text-white transition hover:border-[#0B2340]"
      >
        {initials || <User className="size-4" />}
      </button>

      {open && (
        <div
          role="menu"
          className="rv-pop-in absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="font-bold">{name}</p>
            {email && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {email}
              </p>
            )}
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function AppNav({
  compact = false,
}: {
  /**
   * Drops the mobile link row and shortens the bar. Study screens own the
   * viewport and lead back through their own Back link, so on a phone those
   * two rows of chrome are worth more to the question than to navigation.
   */
  compact?: boolean;
} = {}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const staff = isStaff(session?.user?.role);
  const links = staff ? staffLinks : learnerLinks;
  const home = landingFor(session?.user?.role);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div
        className={`rv-shell flex items-center justify-between gap-6 ${
          compact ? "h-12" : "h-16"
        }`}
      >
        <Link
          href={home}
          className="text-lg font-extrabold tracking-tight text-foreground"
        >
          INSURE
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-7">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "border-b-2 border-[#C9A227] pb-1 text-sm font-bold text-[#8A6D0B]"
                        : "pb-1 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <UserMenu />
        </div>
      </div>

      {/* The link row wraps below the bar on narrow screens. */}
      {!compact && (
        <nav aria-label="Main" className="rv-shell pb-3 md:hidden">
          <ul className="flex items-center gap-5 overflow-x-auto">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "whitespace-nowrap border-b-2 border-[#C9A227] pb-1 text-sm font-bold text-[#8A6D0B]"
                        : "whitespace-nowrap pb-1 text-sm font-semibold text-muted-foreground"
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
