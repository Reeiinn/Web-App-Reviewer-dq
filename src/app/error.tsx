"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * The screen behind an error no page handled.
 *
 * Without one, a throw anywhere in a route tree reaches Next's own error page:
 * an unstyled apology on a white background with no way back into the app. This
 * keeps the reader inside the product and offers the two things worth trying —
 * the render again, and the dashboard.
 *
 * A client component by definition: Next hands it `reset`, and the boundary
 * that catches the error lives in the browser. It cannot read the session, so
 * the way out is /dashboard, which the auth rules resolve for whoever asks —
 * a reviewee lands there, staff are sent to the console, and a signed-out
 * reader is sent to sign in.
 *
 * The digest is the only detail shown. The message itself is not: in production
 * React replaces it with a generic string anyway, and on the server side it can
 * carry the query or the value that broke. The digest is what a maintainer
 * matches against the server logs.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen-safe flex-col bg-background text-foreground">
      <main className="rv-shell flex flex-1 items-center justify-center py-16 sm:py-24">
        <div className="w-full max-w-xl text-center">
          <p
            aria-hidden="true"
            className="text-[clamp(4rem,14vw,8rem)] font-extrabold leading-[0.8] tracking-[-0.07em] text-[#0B2340]"
          >
            Oops
          </p>

          <div className="mx-auto mt-8 h-1.5 w-16 rounded-full bg-[#FFD400]" />

          <h1 className="mt-8 text-display-sm font-extrabold text-[#0B2340]">
            Something went wrong
          </h1>

          <p className="mx-auto mt-4 max-w-md text-base leading-7 text-muted-foreground">
            The page could not finish loading. Your progress is saved as you go,
            so nothing you had already answered is lost.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={reset}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-[#FFD400] px-7 text-base font-bold text-[#0B2340] transition-colors hover:bg-[#C98A00] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0B2340]/25 sm:w-auto"
            >
              Try again
            </button>
            <Link
              href="/dashboard"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-border px-7 text-base font-bold text-[#0B2340] transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0B2340]/25 sm:w-auto"
            >
              Go to dashboard
            </Link>
          </div>

          {error.digest && (
            <p className="mt-8 text-xs text-muted-foreground">
              Reference: <span className="font-mono">{error.digest}</span>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
