import { AppNav } from "@/components/ui/app-nav";
import { BackLink } from "@/components/ui/back-link";

export function Frame({
  title,
  children,
  /**
   * Drops the way back and the heading. The result screen leads with its own
   * verdict, and a title repeating the track above it only pushes the thing
   * the learner opened the page for further down.
   */
  bare = false,
}: {
  title: string;
  children: React.ReactNode;
  bare?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />
      <main className="rv-shell py-[clamp(1.5rem,4vw,2.5rem)]">
        {/* One column for the whole screen: the way back, the title and the
            questions share an edge and centre together, instead of the heading
            hugging the shell while the cards sat in a narrower column of their
            own. */}
        <div className="mx-auto w-full max-w-3xl">
          {!bare && (
            <>
              <BackLink />
              {/* Fluid rather than a jump at md: the title is the tallest
                  thing here, and on a short window that jump costs a
                  question. */}
              <h1 className="mb-[clamp(1rem,3vw,1.5rem)] text-[clamp(1.75rem,5.5vw,3rem)] font-extrabold leading-tight">
                {title}
              </h1>
            </>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
