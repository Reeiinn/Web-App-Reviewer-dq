import { cn } from "@/lib/utils";
import { LoaderCircle } from "lucide-react";

/**
 * The busy indicator for an action in flight.
 *
 * Skeletons stand in for content that is arriving and whose shape is already
 * known. A spinner is for the other direction — something is being sent, and
 * there is no shape to stand in for. Sign-in, exam submit, invite, upload.
 *
 * Always `aria-hidden`: the button's own `aria-busy` and its changed label
 * ("Signing in…") are what a screen reader should hear, not a second
 * announcement from the icon.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <LoaderCircle
      aria-hidden="true"
      className={cn("size-4 shrink-0 animate-spin", className)}
    />
  );
}
