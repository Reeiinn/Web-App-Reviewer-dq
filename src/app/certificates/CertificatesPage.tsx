import { AppNav } from "@/components/ui/app-nav";
import { Certificate } from "@/components/ui/certificate";
import type { CertificateMarks } from "@/lib/helper/certificate-artwork";
import { PASSES_REQUIRED } from "@/lib/helper/practice-exam";
import { examLabels, type ExamType } from "@/lib/types/common";
import Link from "next/link";

export type EarnedCertificate = {
  id: string;
  exam_type: ExamType;
  issued_at: string;
  certificate_no: string;
};

const issuedOn = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export function CertificatesPage({
  certificates,
  recipient,
  marks,
}: {
  certificates: EarnedCertificate[];
  recipient: string;
  marks: CertificateMarks;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />

      <main className="rv-shell py-8">
        <section className="rounded-xl bg-[#0B2340] p-9 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FFD400]">
            Certificates
          </p>
          <h1 className="mt-3 text-4xl font-extrabold md:text-5xl">
            Your Certificates
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
            A certificate is issued for a track once you have passed its
            practice exam {PASSES_REQUIRED} times. Open one to print it.
          </p>
        </section>

        {certificates.length === 0 ? (
          <div className="rv-card mt-6 p-8 text-center">
            <p className="font-bold">You have not earned a certificate yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Clear a track&apos;s practice exam {PASSES_REQUIRED} times and its
              certificate is issued here automatically.
            </p>
            <Link
              href="/dashboard"
              className="mt-5 inline-block rounded-lg bg-[#0B2340] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0F2E4D]"
            >
              Back to the dashboard
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {certificates.map((certificate) => (
              <article
                key={certificate.id}
                className="rv-card overflow-hidden p-4"
              >
                <Link
                  href={`/certificates/${certificate.id}`}
                  className="block rounded-lg border border-border transition hover:border-[#C9A227]"
                >
                  <Certificate
                    examType={certificate.exam_type}
                    recipient={recipient}
                    marks={marks}
                  />
                </Link>

                <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold">
                      {examLabels[certificate.exam_type]}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Issued {issuedOn(certificate.issued_at)} ·{" "}
                      <span className="tabular-nums">
                        {certificate.certificate_no}
                      </span>
                    </p>
                  </div>

                  <Link
                    href={`/certificates/${certificate.id}`}
                    className="rounded-lg bg-[#0B2340] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0F2E4D]"
                  >
                    Open
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
