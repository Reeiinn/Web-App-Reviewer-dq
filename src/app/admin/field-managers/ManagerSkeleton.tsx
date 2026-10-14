import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";

/**
 * A unit manager card, still loading.
 *
 * These cards are dark navy, so the placeholders are a white wash rather than
 * the paper-toned `bg-muted` every other skeleton uses — that fill would sit
 * on the gradient as a bright grey patch.
 */
function ManagerCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#1D3A5C] bg-gradient-to-br from-[#0F2841] to-[#0B1C31] shadow-lg">
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5">
        <Skeleton className="h-3 w-28 bg-white/10" />
        <div className="flex shrink-0 items-center gap-1.5">
          <Skeleton className="h-6 w-16 rounded-full bg-white/10" />
          <Skeleton className="h-6 w-20 rounded-full bg-white/10" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-4 pb-4 pt-3 sm:flex-nowrap">
        <Skeleton className="size-[68px] shrink-0 rounded-full bg-white/10" />

        <div className="min-w-0 flex-1">
          <Skeleton className="h-5 w-40 bg-white/10" />
          <Skeleton className="mt-2 h-3 w-52 bg-white/10" />
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-3 w-20 bg-white/10" />
            <Skeleton className="h-3 w-24 bg-white/10" />
          </div>
        </div>

        <Skeleton className="size-[88px] shrink-0 rounded-full bg-white/10" />
      </div>
    </article>
  );
}

/** The manager cards in their two-column grid. */
export function ManagerGridSkeleton() {
  return (
    <LoadingRegion
      label="Loading unit managers"
      className="mt-6 grid gap-4 xl:grid-cols-2"
    >
      {Array.from({ length: 4 }, (_, card) => (
        <ManagerCardSkeleton key={card} />
      ))}
    </LoadingRegion>
  );
}
