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
