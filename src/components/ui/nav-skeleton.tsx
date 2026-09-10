import { Skeleton } from "@/components/ui/skeleton";

/**
 * The header a route's `loading.tsx` wears while the page streams in.
 *
 * Deliberately not `AppNav`: that reads the session and the avatar on mount,
 * and mounting it in a fallback only to unmount it a moment later would run
 * that work twice per navigation. The wordmark is the one part that is true
 * before anything loads, so it renders for real; the links depend on the
 * account's role, which the fallback does not know yet.
 *
 * The sweep along the top edge is the only moving part that says "a page is on
 * its way" — the skeleton below says what kind of page.
 */
export function NavSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="relative h-0.5 overflow-hidden">
        <div className="rv-route-sweep absolute inset-y-0 w-1/4 bg-gradient-to-r from-[#FFD400] to-[#C98A00]" />
      </div>

      <div
        className={`rv-shell flex items-center justify-between gap-6 ${
          compact ? "h-12" : "h-16"
        }`}
      >
        <span className="text-lg font-extrabold tracking-tight text-foreground">
          INSURE
        </span>

        <div className="hidden items-center gap-7 md:flex">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-18" />
        </div>

        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="size-9 rounded-full" />
        </div>
      </div>

      {!compact && (
        <div className="rv-shell flex items-center gap-5 pb-3 md:hidden">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-18" />
        </div>
      )}
    </header>
  );
}
