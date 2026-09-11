import { Users } from "lucide-react";

/**
 * The account's photo, or its initials while there is none.
 *
 * A roster is a list of people, so the row leads with a face: the photo comes
 * down with the roster itself, already cropped to the square it is drawn at.
 */
export function Avatar({
  name,
  image,
  size = "size-9",
  className = "border-border bg-[#0B2340] text-white",
}: {
  name: string;
  image: string | null;
  /** Tailwind size class: reviewees lead the row, recruiters sit beside it. */
  size?: string;
  /**
   * Border and fill. The default is the navy circle the reviewee table draws;
   * the unit manager cards pass their own so the ring can carry that
   * account's activity.
   */
  className?: string;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full border text-[11px] font-bold ${className}`}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- a data URL has
        // nothing for the image loader to optimise.
        <img
          src={image}
          alt=""
          className="size-full object-cover"
          draggable={false}
        />
      ) : (
        initials || <Users className="size-4" />
      )}
    </span>
  );
}
