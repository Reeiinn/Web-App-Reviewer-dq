import { NavSkeleton } from "@/components/ui/nav-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/** The picker's card, held in place while the page's own auth() resolves. */
export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavSkeleton />

      <main className="rv-shell py-8 sm:py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold sm:text-3xl">
            Which exams are you taking?
          </h1>
          <Skeleton className="mt-2.5 h-4 w-full max-w-md" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-[92px] rounded-xl" />
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-48 rounded-lg" />
          </div>
        </div>
      </main>
    </div>
  );
}
