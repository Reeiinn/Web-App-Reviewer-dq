import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Deliberately not "certificates": that path is taken by the certificate pages,
 * and the middleware guards `/certificates/:path*`. Anything served from under
 * it came back as a 307 to the sign-in screen rather than a file.
 */
const ARTWORK_DIR = "certificate-art";

/** Formats a mark may be supplied in, in the order they are preferred. */
const EXTENSIONS = ["png", "webp", "svg", "jpg", "jpeg"] as const;

/** The marks the drawn sheet cannot produce itself. */
export type CertificateMarks = {
  /** The Sales Manager's signature, cut from the signed artwork. */
  signature: string | null;
  /** The DRACAENA phoenix. */
  logo: string | null;
};

function markUrl(name: string): string | null {
  for (const extension of EXTENSIONS) {
    const file = path.join(
      process.cwd(),
      "public",
      ARTWORK_DIR,
      `${name}.${extension}`,
    );
    if (existsSync(file)) return `/${ARTWORK_DIR}/${name}.${extension}`;
  }
  return null;
}

/**
 * The real signature and logo, where they have been supplied.
 *
 * The sheet itself is markup — every rule, sweep and line of type is drawn — so
 * that it prints at the printer's resolution rather than the artwork's. These
 * two are the exception: a handwritten signature and a drawn phoenix are not
 * things markup can reproduce, so they are lifted from the artwork as images
 * and placed into the drawn sheet.
 *
 * A missing mark is a supported state. The sheet falls back to an approximation
 * and stays legible; it just is not the real one.
 */
export function certificateMarks(): CertificateMarks {
  return {
    signature: markUrl("signature"),
    logo: markUrl("dracaena"),
  };
}
