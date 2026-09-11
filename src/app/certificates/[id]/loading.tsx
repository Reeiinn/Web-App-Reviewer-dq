import { NavSkeleton } from "@/components/ui/nav-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * The sheet's own gap. "All certificates" is a real link from the first frame:
 * someone who opened the wrong certificate should not have to wait for it to
 * arrive before they can leave.
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavSkeleton />

      <main className="rv-shell py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/certificates"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              All certificates
            </Link>
            <Skeleton className="mt-2 h-8 w-56" />
            <Skeleton className="mt-1.5 h-3 w-64" />
          </div>

          <div className="flex gap-2">
            <Skeleton className="h-10 w-28 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>

        <Skeleton className="mx-auto aspect-[1000/707] w-full max-w-5xl rounded-none border border-border" />
      </main>
    </div>
  );
}
