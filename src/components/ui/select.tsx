"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption<Value extends string> = {
  value: Value;
  label: string;
};

/**
 * The toolbar dropdown used across the roster filters.
 *
 * A native <select> only lets us style the closed trigger — the open list is
 * drawn by the OS, so it arrived in Windows chrome next to the rest of the
 * screen. Base UI renders the list itself, which is what buys the navy check,
 * the muted hover row and the shared rv-card surface.
 *
 * Generic over the value so callers keep their own union (SortKey,
 * ReadinessStatus | "ALL") instead of casting a string back out of an event.
 */
export function FilterSelect<Value extends string>({
  label,
  value,
  onValueChange,
  options,
  triggerClassName = "w-56",
  className,
}: {
  label: string;
  value: Value;
  onValueChange: (value: Value) => void;
  options: readonly SelectOption<Value>[];
  triggerClassName?: string;
  className?: string;
}) {
  // Feeding Root the label lookup is what lets Select.Value print "Exam Ready"
  // rather than the raw EXAM_READY key it is holding.
  const items = Object.fromEntries(
    options.map((option) => [option.value, option.label]),
  );

  return (
    <Select.Root
      items={items}
      value={value}
      onValueChange={(next) => {
        // Base UI reports null when a selection is cleared. Every option here
        // is a real choice — "All Statuses" included — so there is nothing to
        // fall back to and the current value stands.
        if (next !== null) onValueChange(next);
      }}
    >
      {/* Root renders no element of its own, so without this wrapper the label
          and the trigger would land as two separate items in the toolbar's
          flex row instead of stacking. */}
      <div className={className}>
        <Select.Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {label}
        </Select.Label>

        <Select.Trigger
          className={`mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground outline-none transition hover:border-[#0B2340] focus-visible:border-[#0B2340] data-[popup-open]:border-[#0B2340] ${triggerClassName}`}
        >
          <Select.Value />
          <Select.Icon className="shrink-0 text-muted-foreground transition-transform duration-200 data-[popup-open]:rotate-180">
            <ChevronDown className="size-4" />
          </Select.Icon>
        </Select.Trigger>
      </div>

      <Select.Portal>
        <Select.Positioner
          className="z-50 outline-none"
          sideOffset={6}
          alignItemWithTrigger={false}
        >
          <Select.Popup className="rv-card rv-pop-in max-h-[min(18rem,var(--available-height))] min-w-[var(--anchor-width)] overflow-y-auto p-1 shadow-lg outline-none">
            <Select.List>
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="flex cursor-default select-none items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-foreground outline-none data-[highlighted]:bg-muted"
                >
                  {/* The indicator only mounts on the selected row, so the slot
                      is held open here to keep every label on one x-position. */}
                  <span className="flex size-4 shrink-0 items-center justify-center text-[#0B2340]">
                    <Select.ItemIndicator>
                      <Check className="size-4" />
                    </Select.ItemIndicator>
                  </span>
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
