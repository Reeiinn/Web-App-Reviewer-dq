"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import type { CSSProperties, ReactNode } from "react";

/**
 * The backdrop and panel every dialog in the app is built on.
 *
 * It exists because the same long class list was repeated at each dialog, and
 * they had drifted: one had lost its height cap and its scroller, so a dialog
 * taller than the screen was centred on it and ran off both ends, with the
 * title above the top edge and the buttons below the bottom one. On a phone
 * that is most of them.
 *
 * Two shapes, one panel:
 *
 *   - On a phone it is a sheet against the bottom edge, capped at 90dvh. That
 *     is the reachable end of the screen, it never exceeds the viewport, and
 *     `dvh` rather than `vh` means the browser's collapsing address bar cannot
 *     push the buttons out of sight.
 *   - From `sm` up it is centred, as it was.
 *
 * Either way the panel scrolls inside itself rather than growing past the
 * screen, and `overscroll-contain` keeps that scroll from turning into a scroll
 * of the page behind it once it reaches the end.
 */
export function DialogPanel({
  /** How wide the centred panel may be. Phones ignore it and use the width. */
  width = "28rem",
  className = "",
  children,
}: {
  width?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <>
      <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-[#0B2340]/50 backdrop-blur-[2px]" />
      <AlertDialog.Popup
        style={{ "--dialog-width": width } as CSSProperties}
        className={[
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col overflow-y-auto overscroll-contain",
          "rounded-t-2xl border border-border bg-card p-6 text-left shadow-xl",
          // Clear of the home indicator on a phone that has one; plain padding
          // on one that does not, since the inset is then zero.
          "pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(var(--dialog-width),calc(100vw-2rem))]",
          "sm:max-h-[calc(100dvh-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-6",
          className,
        ].join(" ")}
      >
        {children}
      </AlertDialog.Popup>
    </>
  );
}
