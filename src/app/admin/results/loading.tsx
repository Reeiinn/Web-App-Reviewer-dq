import { NavSkeleton } from "@/components/ui/nav-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { SummaryTilesSkeleton } from "@/components/ui/summary-tile";

/** The results page's frame, held in place while its auth() read resolves. */
export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavSkeleton />

      <main className="rv-shell py-8">
        <h1 className="text-3xl font-extrabold">Licensing Exam Results</h1>
        <Skeleton className="mt-2.5 h-4 w-full max-w-md" />

        <SummaryTilesSkeleton
          className="sm:grid-cols-3 xl:grid-cols-3"
          tiles={[
            { label: "Passed", tone: "bg-emerald-50" },
            { label: "Failed (retaking)", tone: "bg-rose-50" },
            { label: "Not yet marked", tone: "bg-muted" },
          ]}
        />

        <div className="mt-7 flex flex-wrap items-end gap-4">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-14 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
          </div>
          <Skeleton className="ml-auto h-10 w-56 rounded-lg" />
        </div>

        <div className="rv-card mt-6 space-y-3 p-5">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </main>
    </div>
  );
}
