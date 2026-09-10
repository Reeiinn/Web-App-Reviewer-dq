import { imageSize } from "@/lib/helper/image-size";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Deliberately not "certificates": that path is taken by the certificate pages,
 * and the middleware guards `/certificates/:path*`. Anything served from under
 * it came back as a 307 to the sign-in screen rather than a file.
 */
const ARTWORK_DIR = "certificate-art";

/**
 * Formats a mark may be supplied in, in the order they are preferred.
 *
 * No webp: satori renders the sheet, and it cannot decode one — a webp mark
 * does not fall back to anything, it throws mid-render and the certificate
 * comes back a 500.
 */
const EXTENSIONS = ["png", "svg", "jpg", "jpeg"] as const;

const MIME: Record<(typeof EXTENSIONS)[number], string> = {
  png: "image/png",
  svg: "image/svg+xml",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

/** A mark, and the size it declares — satori has to be told both. */
export type Mark = {
  /** The image itself, as a data URI. */
  src: string;
  width: number;
  height: number;
};

/** The marks the drawn sheet cannot produce itself. */
export type CertificateMarks = {
  /** The Sales Manager's signature, cut from the signed artwork. */
  signature: Mark | null;
  /** The DRACAENA phoenix. */
  logo: Mark | null;
};

/**
 * A mark as a data URI, or null when the file has not been supplied.
 *
 * Data rather than a path because the sheet is rendered by satori inside a
 * route handler, which has no page to resolve `/certificate-art/...` against
 * and does not fetch relative URLs. The bytes have to travel with the markup.
 */
function markData(name: string): Mark | null {
  for (const extension of EXTENSIONS) {
    const file = path.join(
      process.cwd(),
      "public",
      ARTWORK_DIR,
      `${name}.${extension}`,
    );

    if (!existsSync(file)) continue;

    const bytes = readFileSync(file);
    const size = imageSize(bytes);

    // A file whose header says nothing about its size is treated as absent.
    // The sheet's fallback is a drawn approximation, which is a better outcome
    // than a mark stretched to whatever satori guessed.
    if (!size) {
      console.error(`Certificate mark has no readable size, ignoring: ${file}`);
      continue;
    }

    return {
      src: `data:${MIME[extension]};base64,${bytes.toString("base64")}`,
      ...size,
    };
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
