import { AppNav } from "@/components/ui/app-nav";
import { Certificate } from "@/components/ui/certificate";
import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { certificateMarks } from "@/lib/helper/certificate-artwork";
import type { Certificate as CertificateRow } from "@/lib/types/attempt";
import { examLabels } from "@/lib/types/common";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PrintButton } from "./PrintButton";

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
    `SELECT id, exam_type, issued_at, certificate_no
       FROM certificates
      WHERE id = $1 AND user_id = $2`,
    [id, session.user.id],
  );

  const certificate = result.rows[0] as CertificateRow | undefined;
  if (!certificate) {
    notFound();
  }

  const recipient = session.user.name ?? "Scholar";
  const marks = certificateMarks();
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

          <PrintButton />
        </div>

        <div className="rv-print-sheet mx-auto w-full max-w-5xl border border-border shadow-sm">
          <Certificate
            examType={certificate.exam_type}
            recipient={recipient}
            marks={marks}
          />
        </div>

        {!marks.logo && (
          <p className="rv-print-hide mt-4 text-center text-xs text-muted-foreground">
            The phoenix is a stand-in. Drop the real one at{" "}
            <code className="font-mono">public/certificate-art/dracaena.png</code>{" "}
            and it replaces this with no other change.
          </p>
        )}
      </main>
    </div>
  );
}
