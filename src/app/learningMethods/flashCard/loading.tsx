import { NavSkeleton } from "@/components/ui/nav-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { FlashCardBodySkeleton } from "./FlashCardSkeleton";

/**
 * The study screens run compact chrome — they own the viewport and lead back
 * through their own Back link — so the nav placeholder is the short one.
 */
export default function Loading() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <NavSkeleton compact />

      <main className="rv-shell flex min-h-0 max-w-3xl flex-1 flex-col py-3 text-center md:py-4">
        <div className="relative flex shrink-0 items-center justify-center">
          <Skeleton className="absolute left-0 h-5 w-16" />
          <Skeleton className="h-7 w-56" />
        </div>

        <FlashCardBodySkeleton />
      </main>
    </div>
  );
}
