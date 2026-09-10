import { AppNav } from "@/components/ui/app-nav";
import { CertificateThumb } from "@/components/ui/certificate-thumb";
import { SummaryTile } from "@/components/ui/summary-tile";
import { triesLabel, type TrackRecord } from "@/lib/helper/certificate-record";
import { PASSES_REQUIRED, passesLabel } from "@/lib/helper/practice-exam";
import { examLabels, type ExamType } from "@/lib/types/common";
import { Award, ClipboardCheck, ShieldCheck } from "lucide-react";
import Link from "next/link";

export type EarnedCertificate = {
  id: string;
  exam_type: ExamType;
  issued_at: string;
  certificate_no: string;
};

/** A track, what it has cost so far, and its certificate once it is cleared. */
export type TrackStanding = {
  exam_type: ExamType;
  record: TrackRecord;
  certificate: EarnedCertificate | null;
};

const examHref = (examType: ExamType) =>
  `/learningMethods/practiceExam?exam_type=${examType}`;

const onDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

/** One figure from the strip under a certificate. */
function RecordStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

function EarnedCard({
  certificate,
  record,
}: {
  certificate: EarnedCertificate;
  record: TrackRecord;
}) {
  const revision = record.total - record.tries;

  return (
    <article className="rv-card overflow-hidden p-4">
      <Link
        href={`/certificates/${certificate.id}`}
        className="block rounded-lg border border-border transition hover:border-[#C9A227]"
      >
        <CertificateThumb
          id={certificate.id}
          alt={`${examLabels[certificate.exam_type]} certificate`}
        />
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold">
            {examLabels[certificate.exam_type]}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Issued {onDate(certificate.issued_at)} ·{" "}
            <span className="tabular-nums">{certificate.certificate_no}</span>
          </p>
        </div>

        <Link
          href={`/certificates/${certificate.id}`}
          className="rounded-lg bg-[#0B2340] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0F2E4D]"
        >
          Open
        </Link>
      </div>

      {/* What the certificate cost, in the same place on every card: the
          sentence to read, the strip to compare one track against another. */}
      <p className="mt-4 text-sm font-semibold">
        Passed {PASSES_REQUIRED} times in {triesLabel(record.tries)}
        {record.failed > 0
          ? ` — ${plural(record.failed, "sitting")} fell short on the way.`
          : " — every sitting a pass."}
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <RecordStat label="Tries" value={String(record.tries)} />
        <RecordStat label="Failed" value={String(record.failed)} />
        <RecordStat label="Best score" value={`${record.bestPct}%`} />
      </div>

      {revision > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {plural(revision, "sitting")} taken as revision since.
        </p>
      )}
    </article>
  );
}

function OpenTrackRow({ standing }: { standing: TrackStanding }) {
  const { record } = standing;
  const started = record.total > 0;

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-background px-4 py-3">
      <div>
        <p className="font-extrabold">{examLabels[standing.exam_type]}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {started ? (
            <>
              <span className="tabular-nums">
                {passesLabel(record.passes)} passes
              </span>{" "}
              · {triesLabel(record.tries)} so far · best {record.bestPct}%
            </>
          ) : (
            "No sitting taken yet."
          )}
        </p>
      </div>

      <Link
        href={examHref(standing.exam_type)}
        className="rounded-lg border border-[#0B2340] px-4 py-2 text-sm font-bold text-[#0B2340] transition hover:bg-[#0B2340] hover:text-white"
      >
        {started ? "Keep going" : "Start"}
      </Link>
    </li>
  );
}

export function CertificatesPage({ standings }: { standings: TrackStanding[] }) {
  // Newest certificate first, the order this page has always shown them in.
  const earned = standings
    .filter(
      (standing): standing is TrackStanding & { certificate: EarnedCertificate } =>
        standing.certificate !== null,
    )
    .sort((a, b) =>
      b.certificate.issued_at.localeCompare(a.certificate.issued_at),
    );
  const open = standings.filter((standing) => !standing.certificate);

  const passes = standings.reduce(
    (total, standing) => total + standing.record.passes,
    0,
  );
  const sittings = standings.reduce(
    (total, standing) => total + standing.record.total,
    0,
  );

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
            practice exam {PASSES_REQUIRED} times. Each one is shown here with
            the tries it took to earn it. Open one to print it.
          </p>
        </section>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <SummaryTile
            label="Certificates Earned"
            value={earned.length}
            hint={`/ ${standings.length} tracks`}
            icon={Award}
            tone="bg-amber-50 text-amber-700"
          />
          <SummaryTile
            label="Exams Passed"
            value={passes}
            icon={ShieldCheck}
            tone="bg-emerald-50 text-emerald-700"
          />
          <SummaryTile
            label="Sittings Taken"
            value={sittings}
            icon={ClipboardCheck}
            tone="bg-muted text-[#0B2340]"
          />
        </div>

        <section className="mt-8">
          <h2 className="text-xl font-extrabold">Accomplished</h2>

          {earned.length === 0 ? (
            <div className="rv-card mt-3 p-8 text-center">
              <p className="font-bold">You have not earned a certificate yet.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Clear a track&apos;s practice exam {PASSES_REQUIRED} times and
                its certificate is issued here automatically.
              </p>
              <Link
                href="/dashboard"
                className="mt-5 inline-block rounded-lg bg-[#0B2340] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0F2E4D]"
              >
                Back to the dashboard
              </Link>
            </div>
          ) : (
            <div className="mt-3 grid gap-6 lg:grid-cols-2">
              {earned.map((standing) => (
                <EarnedCard
                  key={standing.exam_type}
                  certificate={standing.certificate}
                  record={standing.record}
                />
              ))}
            </div>
          )}
        </section>

        {open.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-extrabold">Still to earn</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Where each remaining track stands, and what it has taken so far.
            </p>

            <ul className="rv-card mt-3 flex flex-col gap-3 p-4">
              {open.map((standing) => (
                <OpenTrackRow key={standing.exam_type} standing={standing} />
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
