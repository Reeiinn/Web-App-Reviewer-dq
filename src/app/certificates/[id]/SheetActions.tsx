"use client";

import { Download, Printer } from "lucide-react";

/**
 * What a learner can do with the sheet on screen.
 *
 * Printing is what the page was built for, so it keeps a button rather than
 * leaving the browser's own menu to be found. Saving is the other half: the
 * sheet is a PNG now, and a file is what gets forwarded to an employer.
 *
 * `src` is here so print has something to preload — the sheet is fetched from
 * the image endpoint, and a print fired before it arrives prints a blank frame.
 */
export function SheetActions({
  src,
  downloadSrc,
}: {
  src: string;
  downloadSrc: string;
}) {
  async function print() {
    // Decode before printing rather than trusting the layout to be ready: the
    // print dialog freezes the page as it stands, so an image still in flight
    // is a blank sheet with no second chance.
    const image = new Image();
    image.src = src;
    await image.decode().catch(() => {});
    window.print();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={downloadSrc}
        download
        className="flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-bold text-foreground transition hover:bg-muted"
      >
        <Download className="size-4" />
        Save image
      </a>

      <button
        type="button"
        onClick={print}
        className="flex items-center gap-2 rounded-lg bg-[#0B2340] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0F2E4D]"
      >
        <Printer className="size-4" />
        Print
      </button>
    </div>
  );
}
