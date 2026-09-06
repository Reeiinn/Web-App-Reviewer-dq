import { ChevronLeft } from "lucide-react";
import Link from "next/link";

/** Top-left way out of a study mode, back to where the track was picked. */
export function BackLink({
  href = "/dashboard",
  label = "Back",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="-ml-1 mb-4 flex min-h-11 w-fit items-center gap-1 px-1 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
    >
      <ChevronLeft className="size-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
