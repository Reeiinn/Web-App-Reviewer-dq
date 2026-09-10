import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Deliberately not "certificates": that path is taken by the certificate pages,
 * and the middleware guards `/certificates/:path*`. Anything served from under
 * it came back as a 307 to the sign-in screen rather than a file.
 */
const ARTWORK_DIR = "certificate-art";

/** Formats a mark may be supplied in, in the order they are preferred. */
const EXTENSIONS = ["png", "webp", "svg", "jpg", "jpeg"] as const;

const MIME: Record<(typeof EXTENSIONS)[number], string> = {
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

/** The marks the drawn sheet cannot produce itself. */
export type CertificateMarks = {
  /** The Sales Manager's signature, cut from the signed artwork. */
  signature: string | null;
  /** The DRACAENA phoenix. */
  logo: string | null;
};

/**
 * A mark as a data URI, or null when the file has not been supplied.
 *
 * Data rather than a path because the sheet is rendered by satori inside a
 * route handler, which has no page to resolve `/certificate-art/...` against
 * and does not fetch relative URLs. The bytes have to travel with the markup.
 */
function markData(name: string): string | null {
  for (const extension of EXTENSIONS) {
    const file = path.join(
      process.cwd(),
      "public",
      ARTWORK_DIR,
      `${name}.${extension}`,
    );

    if (existsSync(file)) {
      const bytes = readFileSync(file).toString("base64");
      return `data:${MIME[extension]};base64,${bytes}`;
    }
  }

  return null;
}

/**
 * The real signature and logo, where they have been supplied.
 *
 * The sheet itself is drawn — every rule, sweep and line of type is an element
 * satori lays out — so that it renders at the sheet's own resolution rather
 * than the artwork's. These two are the exception: a handwritten signature and
 * a drawn phoenix are not things markup reproduces, so they are lifted from the
 * artwork as images and placed into the drawn sheet.
 *
 * A missing mark is a supported state. The sheet falls back to an approximation
 * and stays legible; it just is not the real one.
 *
 * Read once per process rather than per request: the files change only when
 * someone deploys new artwork.
 */
let cached: CertificateMarks | null = null;

export function certificateMarks(): CertificateMarks {
  cached ??= {
    signature: markData("signature"),
    logo: markData("dracaena"),
  };

  return cached;
}
