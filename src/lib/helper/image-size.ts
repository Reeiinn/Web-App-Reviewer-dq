/**
 * The pixel size an image declares about itself.
 *
 * The certificate sheet is drawn by satori, which sizes an image from whichever
 * dimensions it is handed and infers the other one badly — give it a height
 * alone and it keeps the file's full width against it, flattening the picture.
 * So both are always passed, which means both have to be known, which means
 * reading them out of the bytes.
 *
 * Only the formats the sheet actually accepts are here. Each reads a header;
 * none decodes an image.
 */

export type ImageSize = { width: number; height: number };

/** PNG carries width and height in the IHDR chunk, always first, always here. */
function pngSize(bytes: Buffer): ImageSize | null {
  if (bytes.length < 24) return null;
  if (bytes.readUInt32BE(0) !== 0x89504e47) return null;

  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/**
 * JPEG carries them in whichever start-of-frame marker the encoder used, at an
 * offset that depends on every segment before it, so the segments are walked.
 */
function jpegSize(bytes: Buffer): ImageSize | null {
  if (bytes.length < 4 || bytes.readUInt16BE(0) !== 0xffd8) return null;

  let offset = 2;

  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1]!;
    // Start-of-frame, in all its baseline and progressive spellings. The four
    // excluded in each run are not frames: DHT, JPG, DAC and the restarts.
    const isFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isFrame) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }

    // Standalone markers carry no length to skip past.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }

    offset += 2 + bytes.readUInt16BE(offset + 2);
  }

  return null;
}

/**
 * SVG states a size in its root element. The viewBox is preferred: width and
 * height may be percentages or carry units, and the viewBox is the ratio the
 * drawing was authored against either way.
 */
function svgSize(bytes: Buffer): ImageSize | null {
  const head = bytes.subarray(0, 2048).toString("utf8");

  const viewBox = head.match(
    /viewBox\s*=\s*["']\s*[-\d.]+[,\s]+[-\d.]+[,\s]+([\d.]+)[,\s]+([\d.]+)/i,
  );
  if (viewBox) {
    return { width: Number(viewBox[1]), height: Number(viewBox[2]) };
  }

  const width = head.match(/\bwidth\s*=\s*["']\s*([\d.]+)\s*(?:px)?["']/i);
  const height = head.match(/\bheight\s*=\s*["']\s*([\d.]+)\s*(?:px)?["']/i);
  if (width && height) {
    return { width: Number(width[1]), height: Number(height[1]) };
  }

  return null;
}

/** The image's own size, or null when the bytes do not declare one. */
export function imageSize(bytes: Buffer): ImageSize | null {
  const size = pngSize(bytes) ?? jpegSize(bytes) ?? svgSize(bytes);

  // A zero in either direction is not a size anything can be drawn at, and
  // would divide by zero wherever an aspect ratio is worked out from it.
  if (!size || !(size.width > 0) || !(size.height > 0)) return null;

  return size;
}
