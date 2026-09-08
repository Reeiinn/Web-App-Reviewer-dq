import { auth } from "@/lib/auth";
import pool from "@/lib/db";
import { certificateMarks } from "@/lib/helper/certificate-artwork";
import { isStaff } from "@/lib/helper/roles";
import type { Certificate as CertificateRow } from "@/lib/types/attempt";
import { redirect } from "next/navigation";
import { CertificatesPage } from "./CertificatesPage";

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

  const result = await pool.query(
    `SELECT id, exam_type, issued_at, certificate_no
       FROM certificates
      WHERE user_id = $1
      ORDER BY issued_at DESC`,
    [session.user.id],
  );

  const certificates = (result.rows as CertificateRow[]).map((row) => ({
    ...row,
    issued_at: new Date(row.issued_at).toISOString(),
  }));

  return (
    <CertificatesPage
      certificates={certificates}
      recipient={session.user.name ?? "Scholar"}
      marks={certificateMarks()}
    />
  );
}
