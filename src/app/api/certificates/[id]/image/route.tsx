import { CertificateImage, SHEET_HEIGHT, SHEET_WIDTH } from "@/components/ui/certificate-image";
import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { certificateMarks } from "@/lib/helper/certificate-artwork";
import type { ExamType } from "@/lib/types/common";
import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * A certificate as a PNG.
 *
 * The sheet used to be markup the page rendered, which meant anyone could open
 * devtools, retype the name and print the result. The pixels are made here
 * instead, from the holder's own user row, so what the browser gets is a
 * picture it cannot edit into someone else's certificate.
 *
 * This proves nothing about a PNG that arrives from somewhere else — an image
 * can be forged in any editor. What it stops is forging one from this page.
 */

/**
 * The faces the sheet is set in, cut to Latin.
 *
 * Read once at module scope rather than per request: they never change between
 * deploys, and `ImageResponse` counts them against a 500KB budget that the full
 * families would blow on their own. A name in a script outside this subset
 * renders blank rather than wrong — see assets/fonts/README.md.
 */
const FONT_DIR = path.join(process.cwd(), "assets", "fonts");

/** Read synchronously: this runs once as the module loads, so there is no
 *  request waiting on it, and top-level await is not on for this build. */
const face = (file: string, weight: 300 | 400 | 700 | 800 | 900, name: string) => ({
  name,
  data: readFileSync(path.join(FONT_DIR, file)),
  weight,
  style: "normal" as const,
});

const fonts = [
  face("PlayfairDisplay-Regular.ttf", 400, "Playfair Display"),
  face("PlayfairDisplay-Bold.ttf", 700, "Playfair Display"),
  face("PlayfairDisplay-Black.ttf", 900, "Playfair Display"),
  face("GreatVibes-Regular.ttf", 400, "Great Vibes"),
  face("HankenGrotesk-Light.ttf", 300, "Hanken Grotesk"),
  face("HankenGrotesk-Regular.ttf", 400, "Hanken Grotesk"),
  face("HankenGrotesk-Bold.ttf", 700, "Hanken Grotesk"),
  face("HankenGrotesk-ExtraBold.ttf", 800, "Hanken Grotesk"),
];

type CertificateRow = {
  id: string;
  exam_type: ExamType;
  issued_at: Date;
  certificate_no: string;
  recipient: string;
};

/** A certificate number, safe to sit inside a Content-Disposition filename. */
const asFilename = (certificateNo: string) =>
  certificateNo.replace(/[^A-Za-z0-9._-]/g, "-");

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  // Scoped to the holder in the query itself, exactly as the page is: someone
  // else's certificate should be indistinguishable from one that does not
  // exist. The name comes from the joined user row rather than from the
  // session, so it is the holder's own name even when a staff view is what
  // asked for it, and it is never a shared default.
  const result = await pool.query(
    `SELECT c.id, c.exam_type, c.issued_at, c.certificate_no, u.name AS recipient
       FROM certificates c
       JOIN users u ON u.id = c.user_id
      WHERE c.id = $1 AND c.user_id = $2`,
    [id, session.user.id],
  );

  const certificate = result.rows[0] as CertificateRow | undefined;
  if (!certificate) {
    return new Response("Not found", { status: 404 });
  }

  const download = new URL(req.url).searchParams.has("download");

  return new ImageResponse(
    (
      <CertificateImage
        examType={certificate.exam_type}
        recipient={certificate.recipient}
        marks={certificateMarks()}
      />
    ),
    {
      width: SHEET_WIDTH,
      height: SHEET_HEIGHT,
      fonts,
      headers: {
        // Issued once and never revised, so the browser may keep it. Private
        // because it is one holder's document: a shared cache keyed on the URL
        // alone would hand it to whoever asked next.
        "Cache-Control": "private, max-age=31536000, immutable",
        ...(download
          ? {
              "Content-Disposition": `attachment; filename="${asFilename(certificate.certificate_no)}.png"`,
            }
          : {}),
      },
    },
  );
}
