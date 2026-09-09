"use client";

import { AppNav } from "@/components/ui/app-nav";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The frame the About and Help pages share.
 *
 * Both are public: a person who cannot sign in is exactly who reaches for Help,
 * so the header has to work without a session. Whether there is one is decided
 * on the server and passed down, rather than read from `useSession` here, so a
 * signed-in reader never watches a signed-out header swap itself out on hydrate.
 */
export function InfoShell({
  signedIn,
  eyebrow,
  title,
  intro,
  children,
}: {
  signedIn: boolean;
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {signedIn ? <AppNav /> : <SignedOutHeader />}

      <main className="rv-shell flex-1 py-8">
        <section className="rounded-xl bg-[#0B2340] p-9 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FFD400]">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-extrabold md:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
            {intro}
          </p>
        </section>

        {children}
      </main>

      <footer className="border-t border-border">
        <div className="rv-shell flex flex-wrap items-center gap-x-6 gap-y-2 py-6 text-sm text-muted-foreground">
          <span className="font-extrabold tracking-tight text-foreground">
            INSURE
          </span>
          <Link href="/about" className="font-semibold hover:text-foreground">
            About
          </Link>
          <Link href="/help" className="font-semibold hover:text-foreground">
            Help
          </Link>
          <Link href="/privacy" className="font-semibold hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="font-semibold hover:text-foreground">
            Terms
          </Link>
          {!signedIn && (
            <Link href="/" className="font-semibold hover:text-foreground">
              Sign in
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}

/** The bar a signed-out reader gets: the wordmark home, and a way to sign in. */
export function SignedOutHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="rv-shell flex h-16 items-center justify-between gap-6">
        <Link
          href="/"
          className="flex items-baseline gap-2 text-lg font-extrabold tracking-tight text-foreground"
        >
          INSURE
        </Link>
        <Link
          href="/"
          className="bg-[#FDB913] px-4 py-2 text-sm font-bold text-[#0B2340] transition-colors hover:bg-[#C98A00]"
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}

/** A titled block of prose. Every section on both pages is one of these. */
export function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-2xl font-extrabold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
