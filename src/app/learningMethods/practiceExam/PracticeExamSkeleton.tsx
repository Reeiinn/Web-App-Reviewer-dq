import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";

/**
 * The exam paper, still loading.
 *
 * Three question cards rather than the whole paper: the paper scrolls, and
 * standing in for questions below the fold only costs the browser work nobody
 * sees. Each card keeps the four lettered choice rows every question carries.
 */
export function PracticeExamBodySkeleton() {
  return (
    <LoadingRegion label="Loading practice questions">
      <div className="rv-card mb-4 flex items-center justify-between gap-4 p-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>

      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }, (_, question) => (
          <section key={question} className="rv-card p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />

            <div className="mt-4 flex flex-col gap-2.5">
              {Array.from({ length: 4 }, (_, choice) => (
                <div
                  key={choice}
                  className="flex items-center gap-4 rounded-lg border-2 border-border px-4 py-3"
                >
                  <Skeleton className="size-7 shrink-0 rounded-full" />
                  <Skeleton className="h-3.5 w-3/5" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Skeleton className="mt-5 h-12 w-full rounded-lg" />
    </LoadingRegion>
  );
}
