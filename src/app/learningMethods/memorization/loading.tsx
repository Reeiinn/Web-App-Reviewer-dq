import { NavSkeleton } from "@/components/ui/nav-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { MemorizationBodySkeleton } from "./MemorizationSkeleton";

export default function Loading() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <NavSkeleton compact />

      <main className="rv-shell flex min-h-0 flex-1 flex-col py-4 md:py-6">
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-6 w-24 shrink-0 rounded-full" />
          <h1 className="hidden truncate text-xl font-extrabold md:block [@media(max-height:850px)]:sr-only [@media(min-height:900px)]:text-2xl">
            Memorization Mode
          </h1>
          <Skeleton className="ml-auto h-4 w-24 shrink-0" />
        </div>

        <MemorizationBodySkeleton />
      </main>
    </div>
  );
}
