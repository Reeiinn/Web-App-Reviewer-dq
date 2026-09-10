import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

/**
 * These pages are public, so the fallback wears the signed-out header: the
 * session is exactly what the page below is still waiting on, and guessing the
 * signed-in bar would mean swapping the header out on arrival for every reader
 * who is not signed in.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="relative h-0.5 overflow-hidden">
          <div className="rv-route-sweep absolute inset-y-0 w-1/4 bg-gradient-to-r from-[#FFD400] to-[#C98A00]" />
        </div>
        <div className="rv-shell flex h-16 items-center justify-between gap-6">
          <Link
            href="/"
            className="flex items-baseline gap-2 text-lg font-extrabold tracking-tight text-foreground"
          >
            INSURE
          </Link>
          <Skeleton className="h-10 w-24" />
        </div>
      </header>

      <main className="rv-shell flex-1 py-8">
        <section className="rounded-xl bg-[#0B2340] p-9 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FFD400]">
            Terms
          </p>
          <div className="mt-3 h-11 w-80 max-w-full rounded-md bg-white/10 md:h-14" />
          <div className="mt-4 flex max-w-2xl flex-col gap-2">
            <div className="h-3.5 w-full rounded bg-white/10" />
            <div className="h-3.5 w-4/5 rounded bg-white/10" />
          </div>
        </section>

        {Array.from({ length: 3 }, (_, section) => (
          <section key={section} className="mt-10">
            <Skeleton className="h-7 w-64" />
            <div className="mt-3 flex flex-col gap-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/5" />
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
