import { imageSize } from "@/lib/helper/image-size";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** A PNG header declaring the given size. Nothing decodes the pixels. */
function png(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(24);
  bytes.writeUInt32BE(0x89504e47, 0);
  bytes.writeUInt32BE(0x0d0a1a0a, 4);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

/** A JPEG with one segment before the frame, so the walk has to skip it. */
function jpeg(width: number, height: number): Buffer {
  const app0 = Buffer.alloc(4 + 12);
  app0.writeUInt16BE(0xffe0, 0);
  app0.writeUInt16BE(14, 2);

  const sof = Buffer.alloc(11);
  sof.writeUInt16BE(0xffc0, 0);
  sof.writeUInt16BE(9, 2);
  sof[4] = 8;
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);

  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof]);
}

describe("imageSize", () => {
  it("reads a PNG's IHDR", () => {
    expect(imageSize(png(257, 123))).toEqual({ width: 257, height: 123 });
  });

  it("walks past a JPEG's other segments to the frame", () => {
    expect(imageSize(jpeg(640, 480))).toEqual({ width: 640, height: 480 });
  });

  it("prefers an SVG's viewBox, which carries no units", () => {
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 118 86"><path d=""/></svg>`,
    );

    expect(imageSize(svg)).toEqual({ width: 118, height: 86 });
  });

  it("falls back to an SVG's width and height when there is no viewBox", () => {
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="300px" height="110px"></svg>`,
    );

    expect(imageSize(svg)).toEqual({ width: 300, height: 110 });
  });

  it("returns null for bytes that declare nothing", () => {
    expect(imageSize(Buffer.from("not an image at all"))).toBeNull();
  });

  it("returns null rather than a zero that would divide an aspect ratio", () => {
    expect(imageSize(png(0, 123))).toBeNull();
  });

  it("reads the signature the certificate is actually drawn with", () => {
    const file = path.join(
      process.cwd(),
      "public",
      "certificate-art",
      "signature.png",
    );

    const size = imageSize(readFileSync(file));

    // Sized from the file rather than a number written into the sheet, so
    // replacing the artwork with a differently proportioned export does not
    // silently squash it.
    expect(size).not.toBeNull();
    expect(size!.width).toBeGreaterThan(0);
    expect(size!.height).toBeGreaterThan(0);
  });
});
