import { AppNav } from "@/components/ui/app-nav";
import { SignedOutHeader } from "@/components/ui/info-shell";
import { auth } from "@/lib/auth";
import { isStaff, landingFor } from "@/lib/helper/roles";
import Link from "next/link";

/**
 * The screen behind every address the app does not serve.
 *
 * A server component on purpose. The previous version was `"use client"` only
 * so it could render AppNav, which reads the session through `useSession` —
 * so a signed-in reader watched a signed-out header swap itself out on
 * hydrate, and every reader was offered "Back to Dashboard" pointing at the
 * sign-in page. The session is read once here instead, which decides the
 * header and where the way out actually leads: an admin belongs on the
 * console, a reviewee on their dashboard, and someone signed out can only be
 * sent to sign in.
 *
 * Nothing here needs a Suspense boundary for the dynamic `auth()` read: this
 * app sets no cacheComponents or PPR flag, so the route is simply rendered per
 * request. Next injects `noindex` on a 404 itself.
 */
export default async function NotFound() {
  const session = await auth();
  const signedIn = Boolean(session?.user);
  const role = session?.user?.role;

  // Signed out, the only destination that exists is sign-in — /glossary and
  // /dashboard both bounce a reader with no session straight back to it.
  const primary = signedIn
    ? {
        href: landingFor(role),
        label: isStaff(role) ? "Go to console" : "Go to dashboard",
      }
    : { href: "/", label: "Go to sign in" };

  const secondary = signedIn
    ? { href: "/glossary", label: "Glossary" }
    : { href: "/help", label: "Help" };

  return (
    <div className="flex min-h-screen-safe flex-col bg-background text-foreground">
      {signedIn ? <AppNav /> : <SignedOutHeader />}

      <main className="rv-shell flex flex-1 items-center justify-center py-16 sm:py-24">
        <div className="w-full max-w-xl text-center">
          {/* The number is the whole picture: full-strength navy at a size
              nothing else on the page competes with, tracked tight so the
              three glyphs read as one mark. It says nothing a screen reader
              needs — the heading below carries the meaning. */}
          <p
            aria-hidden="true"
            className="text-[clamp(5.5rem,20vw,11rem)] font-extrabold leading-[0.8] tracking-[-0.07em] text-[#0B2340]"
          >
            404
          </p>

          {/* Yellow is the action colour everywhere else in the app; here it
              is the one mark separating the number from the message. */}
          <div className="mx-auto mt-8 h-1.5 w-16 rounded-full bg-[#FFD400]" />

          <h1 className="mt-8 text-display-sm font-extrabold text-[#0B2340]">
            We can&apos;t find that page
          </h1>

          <p className="mx-auto mt-4 max-w-md text-base leading-7 text-muted-foreground">
            The address may be mistyped, or the page may have moved since the
            link was made.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={primary.href}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-[#FFD400] px-7 text-base font-bold text-[#0B2340] transition-colors hover:bg-[#C98A00] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0B2340]/25 sm:w-auto"
            >
              {primary.label}
            </Link>
            <Link
              href={secondary.href}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-border px-7 text-base font-bold text-[#0B2340] transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0B2340]/25 sm:w-auto"
            >
              {secondary.label}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
