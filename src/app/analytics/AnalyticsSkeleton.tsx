import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";

/**
 * One track's mastery card, still loading.
 *
 * The donut keeps its 8rem circle and the three bars keep their labelled rows,
 * so a card that arrives with real dials fills a space that was already the
 * right size.
 */
function TrackMasterySkeleton() {
  return (
    <section className="rv-card p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-6 w-24 rounded" />
      </div>

      <div className="mt-6 flex items-center gap-7">
        <Skeleton className="size-32 shrink-0 rounded-full" />

        <div className="flex-1 space-y-4">
          {Array.from({ length: 3 }, (_, bar) => (
            <div key={bar}>
              <div className="flex items-baseline justify-between">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-8" />
              </div>
              <Skeleton className="mt-1.5 h-2.5 w-full rounded-full" />
            </div>
          ))}

          <div className="flex items-baseline justify-between">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-3 w-6" />
          </div>
        </div>
      </div>
    </section>
  );
}

/** The four track cards in their two-column grid. */
export function AnalyticsBodySkeleton() {
  return (
    <LoadingRegion
      label="Loading your performance"
      className="mt-9 grid gap-6 lg:grid-cols-2"
    >
      {Array.from({ length: 4 }, (_, card) => (
        <TrackMasterySkeleton key={card} />
      ))}
    </LoadingRegion>
  );
}
