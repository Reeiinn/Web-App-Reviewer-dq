"use client";

import { Printer } from "lucide-react";

/**
 * Printing is the whole point of the page, so it gets a button rather than
 * leaving the learner to find the browser's own menu. The print stylesheet in
 * globals.css is what turns the page into a single landscape sheet.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-2 rounded-lg bg-[#0B2340] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0F2E4D]"
    >
      <Printer className="size-4" />
      Print
    </button>
  );
}
