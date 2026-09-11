"use client";

import { certificateImageSrc } from "@/lib/helper/certificate-image-src";
import { useState } from "react";

/**
 * A certificate sheet thumbnail, with a placeholder until the PNG arrives.
 *
 * The sheet is rendered on the server by `/api/certificates/[id]/image`, so it
 * is a network round trip behind the card that frames it. The aspect ratio
 * already held the space; what was missing was any sign the space was going to
 * be filled — an empty white rectangle reads as a broken image, not a pending
 * one.
 *
 * The placeholder sits behind the image rather than swapping with it, so there
 * is no frame where neither is painted. A failed load clears it too: an image
 * that will never arrive should not be advertised as still coming.
 */
export function CertificateThumb({
  id,
  alt,
  className,
}: {
  id: string;
  alt: string;
  className?: string;
}) {
  const [settled, setSettled] = useState(false);

  return (
    <span className={`relative block ${className ?? ""}`}>
      {!settled && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-muted"
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- the sheet is
          rendered by /api/certificates/[id]/image, which already serves it at
          one fixed size; the loader would only re-encode it. */}
      <img
        src={certificateImageSrc(id)}
        alt={alt}
        onLoad={() => setSettled(true)}
        onError={() => setSettled(true)}
        className="relative block aspect-[1000/707] w-full"
      />
    </span>
  );
}
