import { NavSkeleton } from "@/components/ui/nav-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { SummaryTilesSkeleton } from "@/components/ui/summary-tile";
import { ManagerGridSkeleton } from "./ManagerSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavSkeleton />

      <main className="mx-auto w-full max-w-[1500px] px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold">Field Manager Console</h1>
            <Skeleton className="h-7 w-36 rounded-full" />
          </div>
          <Skeleton className="h-10 w-44 rounded-lg" />
        </div>
        <Skeleton className="mt-2.5 h-4 w-full max-w-[72ch]" />

        <SummaryTilesSkeleton
          tiles={[
            { label: "Field Managers", tone: "bg-muted" },
            { label: "Active Today", tone: "bg-emerald-50" },
            { label: "Total Recruits", tone: "bg-[#FFF8D6]" },
            { label: "Inactive", tone: "bg-rose-50" },
          ]}
        />

        <div className="rv-card mt-6 flex flex-wrap items-end gap-6 p-5">
          <Skeleton className="h-10 w-52 rounded-lg" />
          <Skeleton className="h-10 w-64 rounded-lg" />
          <Skeleton className="ml-auto h-10 w-72 rounded-lg" />
        </div>

        <ManagerGridSkeleton />
      </main>
    </div>
  );
}
