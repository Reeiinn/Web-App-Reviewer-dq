"use client";

import { PhotoCropper } from "@/components/ui/photo-cropper";
import { NotificationBell } from "@/components/ui/notification-bell";
import { isStaff, landingFor, staffTitleFor } from "@/lib/helper/roles";
import { Award, Info, LifeBuoy, LogOut, User } from "lucide-react";
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
//
// Certificates is not here either: it is what the account has to show for
// itself rather than a place to work, so it is reached from the user menu.
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

// The field manager console ranks managers against each other, which is the
// Sales Manager's view of their team and nobody else's — a field manager
// signed in here would be reading their own standing among colleagues. The
// route and the API refuse them too; this only keeps the link out of a nav
// that would bounce them.
const adminLinks = [
  { href: "/admin", label: "Admin Console" },
  { href: "/admin/field-managers", label: "Field Managers" },
  { href: "/glossary", label: "Glossary" },
];

const linksFor = (role?: string | null) => {
  if (role === "ADMIN") return adminLinks;
  return isStaff(role) ? staffLinks : learnerLinks;
};

function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  /** The chosen file, held while the learner frames it in the cropper. */
  const [pending, setPending] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const filePicker = useRef<HTMLInputElement>(null);

  const name = session?.user?.name ?? "Scholar";
  const email = session?.user?.email ?? "";
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  // The photo is not in the session token, so it is read once per signed-in
  // visit and then kept in step by the upload itself.
  useEffect(() => {
    if (!session?.user) return;

    let active = true;
    fetch("/api/user/avatar")
      .then((response) => response.json() as Promise<{ image?: string | null }>)
      .then((data) => active && setImage(data.image ?? null))
      .catch(() => active && setImage(null));

    return () => {
      active = false;
    };
  }, [session?.user]);

  async function upload(dataUrl: string) {
    setUploadError("");
    setUploading(true);

    try {
      const response = await fetch("/api/user/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = (await response.json()) as {
        image?: string;
        error?: string;
      };

      if (!response.ok || !data.image) {
        setUploadError(data.error ?? "Could not save that photo.");
        return;
      }
      setImage(data.image);
      setPending(null);
    } catch {
      setUploadError("Could not reach the server.");
    } finally {
      setUploading(false);
    }
  }

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
        className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-border bg-[#0B2340] text-xs font-bold text-white transition hover:border-[#0B2340]"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- a data URL has
          // nothing for the image loader to optimise.
          <img
            src={image}
            alt=""
            className="size-full object-cover"
            draggable={false}
          />
        ) : (
          initials || <User className="size-4" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="rv-pop-in absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
        >
          <div className="border-b border-border px-4 py-3">
            {/* Photo, then who you are: the same left-to-right order the
                trigger implies when the menu opens under it. */}
            <div className="flex items-start gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-[#0B2340] text-sm font-bold text-white">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a data
                  // URL has nothing for the image loader to optimise.
                  <img
                    src={image}
                    alt={`${name}'s profile photo`}
                    className="size-full object-cover"
                    draggable={false}
                  />
                ) : (
                  initials || <User className="size-5" />
                )}
              </span>

              <div className="min-w-0">
                <p className="font-bold">{name}</p>
                {email && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {email}
                  </p>
                )}

                <input
                  ref={filePicker}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    // Clear the value so choosing the same file twice still
                    // fires a change event.
                    event.target.value = "";
                    if (file) {
                      setUploadError("");
                      setPending(file);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => filePicker.current?.click()}
                  disabled={uploading}
                  className="mt-1.5 text-xs font-semibold text-[#8A6D0B] underline underline-offset-2 transition hover:text-[#0B2340] disabled:opacity-60"
                >
                  {uploading ? "Uploading…" : "Upload photo"}
                </button>
              </div>
            </div>

            {uploadError && (
              <p className="mt-2 text-xs font-semibold text-destructive">
                {uploadError}
              </p>
            )}
          </div>

          {/* Certificates is what the account has to show for itself rather
              than a place to work, so it belongs beside the name and photo.
              Staff hold none — the page turns them away — so the entry is
              left out for them rather than linking somewhere that bounces. */}
          {!isStaff(session?.user?.role) && (
            <Link
              href="/certificates"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Award className="size-4" />
              Certificates
            </Link>
          )}

          {/* About and Help sit here rather than in the main nav: that row is
              for the work — dashboards, decks, the console — and it is built
              per role, so these two would have had to be repeated in every
              list. This menu is already the same for everyone. */}
          <Link
            href="/about"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Info className="size-4" />
            About
          </Link>
          <Link
            href="/help"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LifeBuoy className="size-4" />
            Help
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3 border-t border-border px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      )}

      {/* The crop step owns the choice: nothing is uploaded until the square
          in the circle is the one the learner confirmed. */}
      {pending && (
        <PhotoCropper
          file={pending}
          busy={uploading}
          onCancel={() => {
            if (!uploading) setPending(null);
          }}
          onConfirm={(dataUrl) => void upload(dataUrl)}
        />
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
  const links = linksFor(session?.user?.role);
  const home = landingFor(session?.user?.role);
  // A reviewee holds one role and needs no reminder of it; a staff account is
  // read differently depending on whose reviewees it can see, so the wordmark
  // carries the title.
  const title = staffTitleFor(session?.user?.role);

  // "/admin" is a prefix of "/admin/field-managers", so a plain startsWith lit
  // both links at once. The longest match wins instead, which leaves every
  // other link behaving exactly as it did.
  const activeHref = links
    .filter(
      (link) => pathname === link.href || pathname.startsWith(`${link.href}/`),
    )
    .reduce<string | null>(
      (longest, link) =>
        !longest || link.href.length > longest.length ? link.href : longest,
      null,
    );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div
        className={`rv-shell flex items-center justify-between gap-6 ${
          compact ? "h-12" : "h-16"
        }`}
      >
        <Link
          href={home}
          className="flex items-baseline gap-2 tracking-tight text-foreground"
        >
          <span className="text-lg font-extrabold">INSURE</span>
          {title && (
            // Same size and case as the wordmark, only lighter and greyer:
            // weight alone carries the hierarchy, so the title reads as part
            // of one lockup rather than a tag stuck beside it.
            <span className="hidden text-lg font-normal uppercase text-muted-foreground sm:inline">
              {title}
            </span>
          )}
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-7">
            {links.map((link) => {
              const active = link.href === activeHref;
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
          {/* Staff send reminders and receive none, so the bell would only ever
              be empty for them. */}
          {session?.user && !isStaff(session.user.role) && <NotificationBell />}
          <UserMenu />
        </div>
      </div>

      {/* The link row wraps below the bar on narrow screens. */}
      {!compact && (
        <nav aria-label="Main" className="rv-shell pb-3 md:hidden">
          <ul className="flex items-center gap-5 overflow-x-auto">
            {links.map((link) => {
              const active = link.href === activeHref;
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
