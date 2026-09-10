import { NavSkeleton } from "@/components/ui/nav-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { GlossaryBodySkeleton } from "./GlossarySkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavSkeleton />

      <main className="rv-shell py-8">
        {/* The navy masthead is the page's own colour and owes nothing to the
            data, so it renders for real rather than as a grey block. */}
        <section className="rounded-xl bg-[#0B2340] p-9 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-lg">
              <h1 className="text-4xl font-extrabold md:text-5xl">
                Insurance Glossary
              </h1>
              <p className="mt-3 text-sm text-white/75">
                Master the terminology required for your licensing exams. Search
                or browse key terms below.
              </p>
            </div>
            <div className="h-12 w-full rounded-lg bg-white/10 md:max-w-sm" />
          </div>
        </section>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {[92, 80, 128, 104, 104].map((width, filter) => (
            <Skeleton
              key={filter}
              className="h-9 rounded-full"
              style={{ width }}
            />
          ))}
        </div>

        <GlossaryBodySkeleton />
      </main>
    </div>
  );
}
