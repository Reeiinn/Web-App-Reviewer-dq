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

/** How many numbers to draw before giving up; a clash on six hex digits is rare. */
const NUMBER_DRAWS = 3;

/**
 * The certificate a user holds for a track, issuing it if the track has just
 * been cleared.
 *
 * Called on the sitting that takes a learner to the fifth pass, and on every
 * sitting after it, so it has to be idempotent. The unique key on
 * (user_id, exam_type) is what makes it safe: of two requests racing, one
 * inserts and the other hits the key (P2002) and reads the row that won.
 * A P2002 with no row to read back was a clash on certificate_no instead,
 * so another number is drawn.
 */
export async function issueCertificate(
  userId: string,
  examType: ExamType,
): Promise<CertificateRecord | null> {
  for (let draw = 1; ; draw++) {
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
    if (existing) return asCertificate(existing);
    if (draw >= NUMBER_DRAWS) return null;
  }
}

/** Every certificate a learner holds, newest first. */
export async function listCertificates(userId: string): Promise<CertificateRecord[]> {
  const rows = await prisma.certificate.findMany({
    where: { userId },
    orderBy: { issuedAt: "desc" },
    select: certificateSelect,
  });
  return rows.map(asCertificate);
}

export type HeldCertificate = {
  id: string;
  examType: ExamType;
  issuedAt: Date;
  certificateNo: string;
  recipient: string;
};

/**
 * One certificate, only if userId holds it. Scoped to the holder in the
 * query itself: someone else's certificate should be indistinguishable from
 * one that does not exist. The name is the holder's own, off their user row.
 */
export async function findHeldCertificate(
  id: string,
  userId: string,
): Promise<HeldCertificate | null> {
  const row = await prisma.certificate.findFirst({
    where: { id, userId },
    select: {
      id: true,
      examType: true,
      issuedAt: true,
      certificateNo: true,
      user: { select: { name: true } },
    },
  });
  if (!row) return null;

  return {
    id: row.id,
    examType: row.examType as ExamType,
    issuedAt: row.issuedAt,
    certificateNo: row.certificateNo,
    recipient: row.user.name,
  };
}
