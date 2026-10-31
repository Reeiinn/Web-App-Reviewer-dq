"use client";

import { Menu } from "@base-ui/react/menu";
import { examLabels, type ExamType } from "@/lib/types/common";
import type { LicensingOutcome, ResultMark } from "@/lib/types/exam-results";
import { Check, ChevronDown, X } from "lucide-react";
import { useState } from "react";

type Results = Partial<Record<ExamType, ResultMark>>;

/**
 * One chosen exam on a roster row, and the way to record how the real one
 * went.
 *
 * The chip reads the current mark; opening it offers the three things that
 * can be done to it. A choice saves straight away, so the roster never holds
 * an unsaved mark that a reload would quietly throw out.
 */
export function ResultChip({
  revieweeId,
  revieweeName,
  examType,
  mark,
  onChange,
  onError,
}: {
  revieweeId: string;
  revieweeName: string;
  examType: ExamType;
  mark: ResultMark | undefined;
  onChange: (results: Results, notice: string) => void;
  onError: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const outcome = mark?.outcome;
  const label = examLabels[examType];

  async function save(next: LicensingOutcome | null) {
    if (saving) return;
    setSaving(true);
    try {
      const response = await fetch(
        `/api/admin/reviewees/${revieweeId}/results`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ examType, outcome: next }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        onError(data.error ?? "Could not record the result.");
        return;
      }
      onChange(
        data.results ?? {},
        next === null
          ? "Mark cleared"
          : `${revieweeName}: ${label} marked ${next === "PASSED" ? "Passed" : "Failed"}`,
      );
    } catch {
      onError("Could not reach the server. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const tone =
    outcome === "PASSED"
      ? "border-[#B8DFCA] bg-[#E7F4EE] text-[#0F7B52]"
      : outcome === "FAILED"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-border bg-card text-foreground";

  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={saving}
        aria-label={`${label} result for ${revieweeName}`}
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold transition hover:border-[#0B2340] disabled:opacity-60 data-[popup-open]:border-[#0B2340] ${tone}`}
      >
        {label}
        {outcome === "PASSED" ? (
          <>
            <Check className="size-3" strokeWidth={3} /> Passed
          </>
        ) : outcome === "FAILED" ? (
          <>
            <X className="size-3" strokeWidth={3} /> Failed
          </>
        ) : (
          <span className="font-semibold text-muted-foreground">· Not marked</span>
        )}
        <ChevronDown className="size-3 opacity-60" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner className="z-50 outline-none" sideOffset={6} align="start">
          <Menu.Popup className="rv-card rv-pop-in min-w-44 p-1 shadow-lg outline-none">
            <p className="px-3 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              Real exam result
            </p>
            {(
              [
                ["PASSED", "Mark as Passed"],
                ["FAILED", "Mark as Failed"],
                [null, "Clear mark"],
              ] as const
            ).map(([value, text]) => (
              <Menu.Item
                key={text}
                disabled={value === null ? !outcome : value === outcome}
                onClick={() => save(value)}
                className="flex cursor-default select-none items-center rounded-md px-3 py-2 text-sm font-semibold text-foreground outline-none transition-colors data-[disabled]:opacity-40 data-[highlighted]:bg-accent data-[highlighted]:text-[#0B2340]"
              >
                {text}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
