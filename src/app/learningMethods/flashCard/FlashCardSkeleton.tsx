import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";

/**
 * The flashcard reviewer with its deck still loading.
 *
 * This screen owns the viewport: the card takes whatever the two chrome rows
 * leave, and the rating controls sit on the floor. The skeleton keeps that
 * division exactly, so the first real card opens into a frame that has not
 * moved — on a screen where the card's height is measured and its text fitted
 * to it, a frame that resized on arrival would refit the type in front of the
 * learner.
 */
export function FlashCardBodySkeleton() {
  return (
    <LoadingRegion
      label="Loading flashcards"
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="relative mt-2 flex shrink-0 items-center justify-between">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      <div className="mt-2 flex min-h-0 flex-1">
        <div className="rv-card flex w-full flex-col items-center justify-center gap-3 p-5">
          <Skeleton className="h-5 w-4/5 max-w-md" />
          <Skeleton className="h-5 w-3/5 max-w-sm" />
          <Skeleton className="mt-2 h-3 w-40" />
        </div>
      </div>

      <div className="mt-3 flex shrink-0 items-center justify-between">
        <Skeleton className="size-12 rounded-full" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="size-12 rounded-full" />
      </div>

      <div className="mt-3 flex shrink-0 items-center justify-center gap-3">
        <Skeleton className="h-10 w-24 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
    </LoadingRegion>
  );
}
