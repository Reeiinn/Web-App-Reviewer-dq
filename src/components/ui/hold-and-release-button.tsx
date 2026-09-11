"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// The ref is the hold handle, not the button node, so the DOM ref is dropped.
type ButtonHoldAndReleaseProps = Omit<
  React.ComponentProps<typeof Button>,
  "ref"
> & {
  /** Milliseconds the press has to survive before the action fires. */
  holdDuration?: number;
  /** Fired once the bar fills, never on a press that lets go early. */
  onHoldComplete?: () => void;
  /** Copy for the resting and held states. */
  idleLabel?: string;
  holdingLabel?: string;
  /** The hold completed and its request is still in flight. */
  busy?: boolean;
  ref?: React.Ref<HoldHandle>;
};

/**
 * Lets another control drive the same hold — the confirm field hands a held
 * Enter straight to the button instead of deleting on the keystroke.
 */
export type HoldHandle = {
  startHold: () => void;
  endHold: () => void;
};

/**
 * A destructive button that arms itself only while it is held down.
 *
 * A click is one slip away from a delete; a press that has to survive a couple
 * of seconds is not. The fill doubles as the countdown, and letting go early
 * rewinds it and fires nothing.
 *
 * The fill is a CSS transition rather than an animation library: framer-motion
 * renders here but never runs its animations under this Next/React pair, and a
 * countdown that silently never finishes would be a button that cannot delete.
 */
function ButtonHoldAndRelease({
  className,
  holdDuration = 3000,
  onHoldComplete,
  idleLabel = "Hold to delete",
  holdingLabel = "Keep holding…",
  busy = false,
  disabled,
  ref,
  ...props
}: ButtonHoldAndReleaseProps) {
  const [isHolding, setIsHolding] = useState(false);
  const bar = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | null>(null);

  function stopTimer() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }

  /** Rewinds the bar to empty over `ms`, or instantly when ms is 0. */
  function rewind(ms: number) {
    const node = bar.current;
    if (!node) return;

    node.style.transition = ms ? `width ${ms}ms linear` : "none";
    node.style.width = "0%";
  }

  useEffect(() => stopTimer, []);

  function handleHoldStart() {
    if (disabled || isHolding) return;

    stopTimer();
    setIsHolding(true);

    const node = bar.current;
    if (node) {
      // Snap back to empty, flush that, and only then start growing: without
      // the reflow the browser folds both writes into one frame and the bar
      // jumps straight to full.
      rewind(0);
      void node.offsetWidth;
      node.style.transition = `width ${holdDuration}ms linear`;
      node.style.width = "100%";
    }

    timer.current = window.setTimeout(() => {
      stopTimer();
      setIsHolding(false);
      rewind(0);
      onHoldComplete?.();
    }, holdDuration);
  }

  function handleHoldEnd() {
    if (!isHolding) return;

    stopTimer();
    setIsHolding(false);
    rewind(100);
  }

  // Enter and Space are the keyboard's press: held they fill the bar, released
  // early they rewind it, exactly like the mouse. A key that fires the action
  // on one tap would put the delete back one keystroke away.
  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;

    // Auto-repeat while the key stays down must not restart the countdown.
    event.preventDefault();
    if (event.repeat) return;

    handleHoldStart();
  }

  function handleKeyUp(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    handleHoldEnd();
  }

  React.useImperativeHandle(ref, () => ({
    startHold: handleHoldStart,
    endHold: handleHoldEnd,
  }));

  return (
    <Button
      variant="destructive"
      className={cn(
        "relative min-w-44 touch-none overflow-hidden font-bold",
        className,
      )}
      aria-busy={busy}
      disabled={disabled}
      onMouseDown={handleHoldStart}
      onMouseUp={handleHoldEnd}
      onMouseLeave={handleHoldEnd}
      onTouchStart={handleHoldStart}
      onTouchEnd={handleHoldEnd}
      onTouchCancel={handleHoldEnd}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={handleHoldEnd}
      {...props}
    >
      <span
        ref={bar}
        aria-hidden="true"
        style={{ width: "0%" }}
        className="absolute left-0 top-0 h-full bg-destructive/30"
      />
      <span className="relative z-10 flex w-full items-center justify-center gap-2">
        {/* Once the hold is done and the request is away, the icon is the
            only thing that can say so: the label has already changed, and a
            trash can beside "Removing…" reads as a button still waiting to
            be pressed. */}
        {busy ? <Spinner /> : <Trash2 className="size-4" />}
        {isHolding ? holdingLabel : idleLabel}
      </span>
    </Button>
  );
}

export { ButtonHoldAndRelease };
