import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";

/**
 * The index rail and the term cards, still loading.
 *
 * Card heights are staggered because real terms are: one carries a comparison
 * table, the next is two lines. A stack of identical blocks would promise a
 * regularity the page does not have.
 */
export function GlossaryBodySkeleton() {
  return (
    <LoadingRegion
      label="Loading glossary terms"
      className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]"
    >
      <nav className="rv-card sticky top-20 hidden p-4 lg:block">
        <Skeleton className="mb-2.5 h-3 w-20" />
        <div className="flex flex-col gap-2">
          {[88, 64, 76, 92, 58, 80, 70].map((width, term) => (
            <Skeleton
              key={term}
              className="h-3.5"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
      </nav>

      <div className="flex flex-col gap-5">
        {[3, 2, 4].map((lines, card) => (
          <article key={card} className="rv-card p-6">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="mt-2 h-3.5 w-24" />
            <div className="mt-4 flex flex-col gap-2">
              {Array.from({ length: lines }, (_, line) => (
                <Skeleton
                  key={line}
                  className={`h-3 ${line === lines - 1 ? "w-2/5" : "w-full"}`}
                />
              ))}
            </div>
          </article>
        ))}
      </div>
    </LoadingRegion>
  );
}
