import "server-only";
import { randomUUID } from "node:crypto";
import prisma from "@/server/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { certificateNumber } from "@/lib/helper/certificate-number";
import type { ExamType } from "@/lib/types/common";

/**
 * Certificates: one per learner per cleared track. Every query on the
 * certificates table goes through here.
 */

export type CertificateRecord = {
  id: string;
  userId: string;
  examType: ExamType;
  issuedAt: Date;
  certificateNo: string;
};

const certificateSelect = {
  id: true,
  userId: true,
  examType: true,
  issuedAt: true,
  certificateNo: true,
} as const;

type CertificateRow = Prisma.CertificateGetPayload<{ select: typeof certificateSelect }>;

// Legacy IIAP rows are passed through, as everywhere else.
const asCertificate = (row: CertificateRow): CertificateRecord => ({
  ...row,
  examType: row.examType as ExamType,
});

/**
 * The certificate a user holds for a track, issuing it if the track has just
 * been cleared.
 *
 * Called on the sitting that takes a learner to the fifth pass, and on every
 * sitting after it, so it has to be idempotent. The unique key on
 * (user_id, exam_type) is what makes it safe: of two requests racing, one
 * inserts and the other hits the key (P2002) and reads the row that won.
 */
export async function issueCertificate(
  userId: string,
  examType: ExamType,
): Promise<CertificateRecord | null> {
  const issuedAt = new Date();
  try {
    const created = await prisma.certificate.create({
      data: {
        userId,
        examType,
        issuedAt,
        certificateNo: certificateNumber(examType, issuedAt, randomUUID()),
      },
      select: certificateSelect,
    });
    return asCertificate(created);
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
  }

  const existing = await prisma.certificate.findUnique({
    where: { userId_examType: { userId, examType } },
    select: certificateSelect,
  });
  return existing ? asCertificate(existing) : null;
}
