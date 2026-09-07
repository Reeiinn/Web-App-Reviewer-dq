import { ChevronLeft } from "lucide-react";
import Link from "next/link";

/** Top-left way out of a study mode, back to where the track was picked. */
export function BackLink({
  href = "/dashboard",
  label = "Back",
  className = "mb-4",
}: {
  href?: string;
  label?: string;
  /** Spacing override for screens that have to account for every pixel. */
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`-ml-1 flex min-h-11 w-fit shrink-0 items-center gap-1 px-1 text-sm font-semibold text-muted-foreground transition hover:text-foreground ${className}`}
    >
      <ChevronLeft className="size-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
