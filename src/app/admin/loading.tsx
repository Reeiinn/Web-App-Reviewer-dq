import { NavSkeleton } from "@/components/ui/nav-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { SummaryTilesSkeleton } from "@/components/ui/summary-tile";
import { RosterTableSkeleton } from "./RosterSkeleton";

/**
 * The console's own gap, before the page knows whether it is being read by an
 * Admin or a Manager. It assumes the Manager's narrower table: guessing the
 * Admin's extra "Recruited By" column and being wrong would shift every cell
 * to its left when the real roster lands.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavSkeleton />

      <main className="rv-shell py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-extrabold">Reviewee Directory</h1>
              <Skeleton className="h-7 w-32 rounded-full" />
            </div>
            <Skeleton className="mt-2.5 h-4 w-full max-w-96" />
          </div>
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>

        <SummaryTilesSkeleton
          tiles={[
            { label: "Total Reviewees", tone: "bg-muted" },
            { label: "Exam Ready", tone: "bg-emerald-50" },
            { label: "On Track", tone: "bg-amber-50" },
            { label: "At Risk", tone: "bg-rose-50" },
          ]}
        />

        <div className="mt-7 flex flex-wrap items-end gap-4">
          <Skeleton className="h-10 w-52 rounded-lg" />
          <Skeleton className="h-10 w-64 rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
          <Skeleton className="ml-auto h-10 w-72 rounded-lg" />
        </div>

        <RosterTableSkeleton isAdmin={false} />
      </main>
    </div>
  );
}
