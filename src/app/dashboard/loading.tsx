import { NavSkeleton } from "@/components/ui/nav-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardBodySkeleton } from "./DashboardSkeleton";

/**
 * Shown from the moment a nav link is clicked until the page's own `auth()`
 * read resolves on the server. Matches the fixed-height shell the dashboard
 * renders into, so the swap to real content moves nothing.
 */
export default function Loading() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-clip bg-background text-foreground">
      <div className="shrink-0">
        <NavSkeleton />
      </div>

      <main className="rv-shell min-h-0 flex-1 overflow-clip py-4 sm:py-6">
        <Skeleton className="h-7 w-64 sm:h-8 md:h-9" />
        <Skeleton className="mt-2 hidden h-4 w-72 sm:block" />
        {/* The two-tab switcher below lg. It is chrome rather than data, so
            the page keeps it live while loading — the fallback carries it for
            the same reason, and the row does not appear out of nowhere. */}
        <div className="mt-3 lg:hidden">
          <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
            <span className="flex-1 rounded-md bg-background px-3 py-2 text-center text-sm font-bold shadow-sm">
              Exam Tracks
            </span>
            <span className="flex-1 px-3 py-2 text-center text-sm font-bold text-muted-foreground">
              Quick Access
            </span>
          </div>
        </div>

        <DashboardBodySkeleton />
      </main>
    </div>
  );
}
