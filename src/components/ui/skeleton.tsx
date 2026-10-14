import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

/**
 * A placeholder block shaped like the thing that is still loading.
 *
 * Pulse rather than a travelling shimmer: INSURE is flat and matte everywhere
 * else, and a gradient sweep would introduce a glassy surface the design does
 * not otherwise have. `animate-pulse` also settles at full opacity when
 * `prefers-reduced-motion` clamps it in globals.css, so a reader who has asked
 * for stillness still sees the shape.
 *
 * Every skeleton is `aria-hidden`: the shapes mean nothing read aloud. The
 * announcement belongs to the one `LoadingRegion` wrapping them.
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

/**
 * The announcement wrapper for a screenful of skeletons.
 *
 * Screen readers get one polite "Loading your dashboard…" rather than silence
 * from a tree of `aria-hidden` boxes; sighted readers get only the shapes.
 * `role="status"` is already polite and atomic, so the label is read once when
 * it appears and again when it is replaced by the real content.
 */
export function LoadingRegion({
  label,
  className,
  children,
  ...props
}: ComponentProps<"div"> & { label: string }) {
  return (
    <div role="status" className={className} {...props}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
