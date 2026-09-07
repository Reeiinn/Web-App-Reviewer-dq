"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

/** Base font size in px; every size inside the card is an em multiple of it. */
const MAX_SIZE = 34;
const MIN_SIZE = 9;
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
      while (size > MIN_SIZE && content.scrollHeight > box.clientHeight) {
        size -= STEP;
        content.style.fontSize = `${size}px`;
      }

      setFontSize(size);
    };

    fit();

    // The first pass can measure fallback metrics; redo it once the real font
    // is in place.
    document.fonts?.ready.then(fit).catch(() => {});

    const observer = new ResizeObserver(fit);
    observer.observe(box);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [contentKey]);

  return { boxRef, contentRef, fontSize };
}
