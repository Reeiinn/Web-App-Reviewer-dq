import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { certificateMarks } from "@/lib/helper/certificate-artwork";
import { trackRecord, type Sitting } from "@/lib/helper/certificate-record";
import { isStaff } from "@/lib/helper/roles";
import type { Certificate as CertificateRow } from "@/lib/types/attempt";
import { examTypes, type ExamType } from "@/lib/types/common";
import { redirect } from "next/navigation";
import { CertificatesPage, type TrackStanding } from "./CertificatesPage";

export const metadata = {
  title: "Certificates — INSURE",
};

type SittingRow = Sitting & { exam_type: ExamType };

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

  // The certificates say which tracks were cleared; the sittings say what each
  // one cost. Both are read here so the two can never be a page apart.
  const [certificateResult, sittingResult] = await Promise.all([
    pool.query(
      `SELECT id, exam_type, issued_at, certificate_no
         FROM certificates
        WHERE user_id = $1
        ORDER BY issued_at DESC`,
      [session.user.id],
    ),
    pool.query(
      `SELECT exam_type, passed, score, total_items, completed_at
         FROM exam_attempts
        WHERE user_id = $1 AND completed_at IS NOT NULL
        ORDER BY completed_at ASC`,
      [session.user.id],
    ),
  ]);

  const certificates = (certificateResult.rows as CertificateRow[]).map(
    (row) => ({
      id: row.id,
      exam_type: row.exam_type,
      certificate_no: row.certificate_no,
      issued_at: new Date(row.issued_at).toISOString(),
    }),
  );

  const sittings = new Map<ExamType, Sitting[]>();
  for (const row of sittingResult.rows as SittingRow[]) {
    const track = sittings.get(row.exam_type) ?? [];
    track.push({
      passed: row.passed,
      score: row.score,
      total_items: row.total_items,
      completed_at: new Date(row.completed_at).toISOString(),
    });
    sittings.set(row.exam_type, track);
  }

  const standings: TrackStanding[] = examTypes.map((examType) => ({
    exam_type: examType,
    record: trackRecord(sittings.get(examType) ?? []),
    certificate: certificates.find((one) => one.exam_type === examType) ?? null,
  }));

  return (
    <CertificatesPage
      standings={standings}
      recipient={session.user.name ?? "Scholar"}
      marks={certificateMarks()}
    />
  );
}
