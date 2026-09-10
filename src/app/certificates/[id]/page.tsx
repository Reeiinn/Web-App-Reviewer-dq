import { AppNav } from "@/components/ui/app-nav";
import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { certificateImageSrc } from "@/lib/helper/certificate-image-src";
import type { Certificate as CertificateRow } from "@/lib/types/attempt";
import { examLabels } from "@/lib/types/common";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SheetActions } from "./SheetActions";

export const metadata = {
  title: "Certificate — INSURE",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const { id } = await params;

  // Scoped to the holder in the query itself: a certificate belonging to
  // someone else should be indistinguishable from one that does not exist.
  const result = await pool.query(
    `SELECT c.id, c.exam_type, c.issued_at, c.certificate_no, u.name AS recipient
       FROM certificates c
       JOIN users u ON u.id = c.user_id
      WHERE c.id = $1 AND c.user_id = $2`,
    [id, session.user.id],
  );

  const certificate = result.rows[0] as
    | (CertificateRow & { recipient: string })
    | undefined;
  if (!certificate) {
    notFound();
  }

  // The holder's own name, off their user row — the same source the sheet
  // itself is rendered from, so the page and the image cannot disagree.
  const recipient = certificate.recipient;
  const issued = new Date(certificate.issued_at).toLocaleDateString("en-PH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="rv-print-hide">
        <AppNav compact />
      </div>

      <main className="rv-shell py-6">
        <div className="rv-print-hide mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/certificates"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              All certificates
            </Link>
            <h1 className="mt-2 text-2xl font-extrabold">
              {examLabels[certificate.exam_type]}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Issued {issued} ·{" "}
              <span className="tabular-nums">
                {certificate.certificate_no}
              </span>
            </p>
          </div>

          <SheetActions
            src={certificateImageSrc(certificate.id)}
            downloadSrc={certificateImageSrc(certificate.id, {
              download: true,
            })}
          />
        </div>

        <div className="rv-print-sheet mx-auto w-full max-w-5xl border border-border shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element -- the sheet is
              rendered by /api/certificates/[id]/image at one fixed size; the
              loader would only re-encode it. */}
          <img
            src={certificateImageSrc(certificate.id)}
            alt={`${examLabels[certificate.exam_type]} certificate awarded to ${recipient}`}
            className="block aspect-[1000/707] w-full"
          />
        </div>

      </main>
    </div>
  );
}
