import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";

/**
 * The memorization reviewer with its question set still loading.
 *
 * Same viewport-owning shape as the live screen: progress rail, then the
 * question column beside the mastery panel that only appears from lg up. Four
 * choice rows, because every question in the set has four.
 */
export function MemorizationBodySkeleton() {
  return (
    <LoadingRegion
      label="Loading questions"
      className="flex min-h-0 flex-1 flex-col"
    >
      <Skeleton className="mt-3 h-2 w-full shrink-0 rounded-full" />

      <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[2.6fr_1fr]">
        <div className="flex min-h-0 flex-col">
          <section className="rv-card flex min-h-0 flex-1 flex-col p-4 sm:p-6">
            <Skeleton className="h-6 w-40 shrink-0 rounded-full" />

            <div className="mt-3 flex min-h-0 flex-1 flex-col justify-center gap-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />

              <div className="mt-4 flex flex-col gap-2.5">
                {Array.from({ length: 4 }, (_, choice) => (
                  <div
                    key={choice}
                    className="flex items-center gap-3 rounded-lg border-2 border-border px-4 py-3"
                  >
                    <Skeleton className="size-7 shrink-0 rounded-full" />
                    <Skeleton className="h-3.5 w-2/3" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* The navy action bar is chrome, not content — it renders solid so
              the column does not end in a grey band. */}
          <div className="mt-3 flex shrink-0 items-center justify-between gap-4 rounded-xl bg-[#0B2340] px-4 py-2.5 sm:px-6">
            <Skeleton className="h-4 w-24 bg-white/10" />
            <Skeleton className="h-10 w-36 rounded-lg bg-white/10" />
          </div>
        </div>

        <aside className="hidden min-h-0 flex-col gap-4 lg:flex">
          <Skeleton className="h-48 w-full rounded-xl" />
        </aside>
      </div>
    </LoadingRegion>
  );
}
