import { auth } from "@/lib/auth";
import { trackRecord, type Sitting } from "@/lib/helper/certificate-record";
import { isStaff } from "@/lib/helper/roles";
import { inFocus, needsExamChoice } from "@/lib/helper/exam-choice";
import { examTypes, type ExamType } from "@/lib/types/common";
import { listCompletedSittings } from "@/server/data/attempts";
import { listCertificates } from "@/server/data/certificates";
import { redirect } from "next/navigation";
import { CertificatesPage, type TrackStanding } from "./CertificatesPage";

export const metadata = {
  title: "Certificates — INSURE",
};

export default async function Page() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  // Staff do not study, so they hold no certificates and this page would only
  // ever be empty for them — the same reason the study screens turn them away.
  if (isStaff(session.user.role)) {
    redirect("/admin");
  }

  // Not in the middleware's learner list, so the picker is asked for here.
  const { focusTracks } = session.user;
  if (needsExamChoice(session.user.role, focusTracks)) {
    redirect("/choose-exams");
  }

  // The certificates say which tracks were cleared; the sittings say what each
  // one cost. Both are read here so the two can never be a page apart.
  const [held, completed] = await Promise.all([
    listCertificates(session.user.id),
    listCompletedSittings(session.user.id),
  ]);

  const certificates = held.map((row) => ({
    id: row.id,
    exam_type: row.examType,
    certificate_no: row.certificateNo,
    issued_at: row.issuedAt.toISOString(),
  }));

  const sittings = new Map<ExamType, Sitting[]>();
  for (const row of completed) {
    const track = sittings.get(row.examType) ?? [];
    track.push({
      passed: row.passed,
      score: row.score,
      total_items: row.totalItems,
      completed_at: row.completedAt.toISOString(),
    });
    sittings.set(row.examType, track);
  }

  // The exams they picked, plus any they earned a certificate on before
  // dropping it: an earned certificate is never hidden from its owner.
  const shown = examTypes.filter(
    (examType) =>
      inFocus(focusTracks, examType) ||
      certificates.some((one) => one.exam_type === examType),
  );

  const standings: TrackStanding[] = shown.map((examType) => ({
    exam_type: examType,
    record: trackRecord(sittings.get(examType) ?? []),
    certificate: certificates.find((one) => one.exam_type === examType) ?? null,
  }));

  return (
    <CertificatesPage standings={standings} />
  );
}
