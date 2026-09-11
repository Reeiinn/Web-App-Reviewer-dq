import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";

/**
 * A track card with nothing in it yet.
 *
 * Every bar sits where the real card puts its own content — heading, blurb,
 * two labelled meters, the study button — so the four cards hold their grid
 * and nothing shifts when the figures land.
 */
function TrackCardSkeleton() {
  return (
    <section className="rv-card flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-4 w-28 sm:w-40" />
        <Skeleton className="size-4 shrink-0 rounded" />
      </div>

      <Skeleton className="mt-1.5 hidden h-3 w-4/5 sm:block" />

      <div className="mt-2 sm:mt-3">
        <div className="flex items-baseline justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="mt-1.5 h-1.5 w-full rounded-full" />
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-6" />
      </div>
      <Skeleton className="mt-1.5 h-1.5 w-full rounded-full" />

      <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-3 sm:flex-nowrap">
        <Skeleton className="h-9 w-full rounded-lg sm:w-32" />
        <Skeleton className="h-9 w-full rounded-lg sm:w-28" />
      </div>
    </section>
  );
}

/**
 * The dashboard's two columns, still loading.
 *
 * Shared by the route's `loading.tsx` and by the page's own fetch state, so
 * the shape a learner sees on navigation is the same one they keep looking at
 * until `/api/progress` answers. Without it the screen rendered a confident
 * 0% on every track — a learner on 64% watched their progress reset and refill
 * on every visit.
 */
export function DashboardBodySkeleton() {
  return (
    <LoadingRegion
      label="Loading your dashboard"
      className="mt-4 lg:grid lg:grid-cols-[1.8fr_1fr] lg:gap-6"
    >
      <div>
        <h2 className="hidden text-xl font-extrabold lg:block">Exam Tracks</h2>
        <div className="grid grid-cols-2 gap-3 lg:mt-3">
          {Array.from({ length: 4 }, (_, card) => (
            <TrackCardSkeleton key={card} />
          ))}
        </div>
      </div>

      <div className="hidden lg:block">
        <h2 className="text-xl font-extrabold">Quick Access</h2>
        <div className="mt-3 flex flex-col gap-3">
          {Array.from({ length: 2 }, (_, card) => (
            <Skeleton key={card} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}
