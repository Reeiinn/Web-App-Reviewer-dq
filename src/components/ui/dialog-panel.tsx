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
 *
 * Padding comes from `rv-dialog-pad`, which publishes the figure it used as
 * `--dialog-pad`. A sticky band inside the panel has to cancel exactly that
 * much to reach the edges, so the two cannot be allowed to drift apart.
 */
export function DialogPanel({
  /** How wide the centred panel may be. Phones ignore it and use the width. */
  width = "28rem",
  /**
   * Slide the panel in and out instead of having it appear.
   *
   * Off by default. Base UI holds the panel mounted until its transition ends,
   * so turning this on changes when a dialog unmounts as well as how it looks —
   * the dialogs that have not been looked at under that behaviour keep the one
   * they were written against.
   */
  animated = false,
  className = "",
  children,
}: {
  width?: string;
  animated?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <>
      <AlertDialog.Backdrop
        className={[
          "fixed inset-0 z-50 bg-[#0B2340]/50 backdrop-blur-[2px]",
          animated ? "rv-dialog-backdrop-motion" : "",
        ].join(" ")}
      />
      <AlertDialog.Popup
        style={{ "--dialog-width": width } as CSSProperties}
        className={[
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col overflow-y-auto overscroll-contain",
          "rv-dialog-pad rounded-t-2xl border border-border bg-card text-left shadow-xl",
          "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(var(--dialog-width),calc(100vw-2rem))]",
          "sm:max-h-[calc(100dvh-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl",
          animated ? "rv-dialog-popup-motion" : "",
          className,
        ].join(" ")}
      >
        {children}
      </AlertDialog.Popup>
    </>
  );
}
