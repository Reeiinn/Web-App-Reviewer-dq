import { NavSkeleton } from "@/components/ui/nav-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsBodySkeleton } from "./AnalyticsSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavSkeleton />

      <main className="rv-shell py-10">
        <Skeleton className="h-10 w-56 md:h-12" />
        <Skeleton className="mt-3 h-4 w-80" />
        <AnalyticsBodySkeleton />
      </main>
    </div>
  );
}
