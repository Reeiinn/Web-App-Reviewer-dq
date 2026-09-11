import { NavSkeleton } from "@/components/ui/nav-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { PracticeExamBodySkeleton } from "./PracticeExamSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavSkeleton />

      <main className="rv-shell py-[clamp(1.5rem,4vw,2.5rem)]">
        <div className="mx-auto w-full max-w-3xl">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="mb-[clamp(1rem,3vw,1.5rem)] mt-4 h-10 w-80 max-w-full sm:h-12" />
          <PracticeExamBodySkeleton />
        </div>
      </main>
    </div>
  );
}
