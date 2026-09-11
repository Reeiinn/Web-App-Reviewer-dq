import { NavSkeleton } from "@/components/ui/nav-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { SummaryTilesSkeleton } from "@/components/ui/summary-tile";
import { PASSES_REQUIRED } from "@/lib/helper/practice-exam";

/**
 * Certificates is the one screen that reads its data on the server — two
 * queries against `certificates` and `exam_attempts` before a single pixel is
 * sent — so the whole page waits on the database rather than on a fetch after
 * paint. That makes this the fallback that earns its keep most.
 *
 * The masthead is fixed copy, so it renders for real; only the counts and the
 * sheets are stood in for.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavSkeleton />

      <main className="rv-shell py-8">
        <section className="rounded-xl bg-[#0B2340] p-9 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FFD400]">
            Certificates
          </p>
          <h1 className="mt-3 text-4xl font-extrabold md:text-5xl">
            Your Certificates
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
            A certificate is issued for a track once you have passed its
            practice exam {PASSES_REQUIRED} times. Each one is shown here with
            the tries it took to earn it. Open one to print it.
          </p>
        </section>

        <SummaryTilesSkeleton
          className="sm:grid-cols-3 xl:grid-cols-3"
          tiles={[
            { label: "Certificates Earned", tone: "bg-amber-50" },
            { label: "Exams Passed", tone: "bg-emerald-50" },
            { label: "Sittings Taken", tone: "bg-muted" },
          ]}
        />

        <section className="mt-8">
          <h2 className="text-xl font-extrabold">Accomplished</h2>

          <div className="mt-3 grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 2 }, (_, card) => (
              <article key={card} className="rv-card overflow-hidden p-4">
                <Skeleton className="aspect-[1000/707] w-full rounded-lg" />

                <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-9 w-20 rounded-lg" />
                </div>

                <Skeleton className="mt-4 h-4 w-3/4" />

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {Array.from({ length: 3 }, (_, stat) => (
                    <Skeleton key={stat} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
