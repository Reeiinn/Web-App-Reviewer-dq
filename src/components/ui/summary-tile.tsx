import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/** One figure from the row of counts that heads a console. */
export function SummaryTile({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  /** Tailwind background and text classes for the icon chip. */
  tone: string;
}) {
  return (
    <div className="rv-card flex items-center justify-between p-5">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-3xl font-extrabold">
          {value}
          {hint && (
            <span className="ml-1.5 text-sm font-semibold text-muted-foreground">
              {hint}
            </span>
          )}
        </p>
      </div>
      <span
        className={`flex size-10 items-center justify-center rounded-lg ${tone}`}
      >
        <Icon className="size-5" />
      </span>
    </div>
  );
}

/**
 * A row of counts, still loading.
 *
 * Both consoles tally these from a roster they have not received yet, so
 * before this they each opened on a full row of confident noughts. Only the
 * figure is stood in for: the label and the icon chip are fixed.
 */
export function SummaryTilesSkeleton({
  tiles,
  className,
}: {
  /** One entry per tile: its fixed label, and the icon chip's background. */
  tiles: { label: string; tone: string }[];
  /** Overrides the grid, for the consoles that lay these out differently. */
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rv-card flex items-center justify-between p-5"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {tile.label}
            </p>
            <Skeleton className="mt-2 h-8 w-16" />
          </div>
          <span className={`size-10 rounded-lg ${tile.tone}`} />
        </div>
      ))}
    </div>
  );
}
