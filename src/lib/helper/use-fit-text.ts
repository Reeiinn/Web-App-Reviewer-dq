"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

/** Base font size in px; every size inside the card is an em multiple of it. */
/** The ceiling is a reading limit too: a two-word answer set in the whole card
    reads as a poster, not as a card, so the text stops growing well before the
    frame does. */
const MAX_SIZE = 24;
const MIN_SIZE = 11;
const STEP = 0.5;

export type FitText<Box extends HTMLElement, Content extends HTMLElement> = {
  boxRef: RefObject<Box | null>;
  contentRef: RefObject<Content | null>;
  fontSize: number;
};

/**
 * Shrinks a block's base font size until it fits inside a fixed-height box.
 *
 * Flashcard frames are the same size on every card, so a long question scales
 * its own text down instead of stretching the card and shifting the controls
 * underneath it.
 *
 * `contentKey` re-runs the fit whenever the text changes.
 */
export function useFitText<
  Box extends HTMLElement,
  Content extends HTMLElement,
>(contentKey: string): FitText<Box, Content> {
  const boxRef = useRef<Box>(null);
  const contentRef = useRef<Content>(null);
  const [fontSize, setFontSize] = useState(MAX_SIZE);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const content = contentRef.current;
    if (!box || !content) return;

    let cancelled = false;

    const fit = () => {
      if (cancelled) return;

      let size = MAX_SIZE;
      content.style.fontSize = `${size}px`;

      // Step down until the text clears the frame, or the floor is reached.
      // The frame is measured every pass: a step that removes the scrollbar
      // widens the box, and the wrapping that follows is what has to fit.
      while (size > MIN_SIZE && content.scrollHeight > box.clientHeight) {
        size -= STEP;
        content.style.fontSize = `${size}px`;
      }

      setFontSize(size);
    };

    fit();

    // A card mounts before the flip frame has its final height, so the first
    // pass can fit against a box that is about to change size. Measure again
    // on the next frame, when the layout it is fitting into is the real one.
    const frame = window.requestAnimationFrame(fit);

    // The first pass can measure fallback metrics; redo it once the real font
    // is in place.
    document.fonts?.ready.then(fit).catch(() => {});

    const observer = new ResizeObserver(fit);
    observer.observe(box);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [contentKey]);

  return { boxRef, contentRef, fontSize };
}
