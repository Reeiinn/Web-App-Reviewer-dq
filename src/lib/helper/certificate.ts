import type { ExamType } from "@/lib/types/common";

/**
 * What a track's certificate says, and which artwork file carries it.
 *
 * The wording is fixed per design rather than derived from examLabels: the
 * certificate is a printed document that was signed off in that exact form,
 * and a label the app is free to reword is not the same thing as the line on
 * the paper.
 */
export type CertificateDesign = {
  /** The line under "for the", as it is printed. */
  title: string;
  /** Basename of the artwork in public/certificate-art. */
  slug: string;
  /**
   * Size of the title line, in `cqw` — a share of the sheet's width.
   *
   * It varies per design because the titles differ in length by nearly half
   * again: one size for all three either wraps the longest onto a second line,
   * over the row beneath it, or leaves the shortest floating in a third of the
   * measure. The artwork sets each title to fill the width, and so does this.
   */
  titleSize: string;
};

/**
 * IIAP Set A and Set B share one design. They are two sittings of the same
 * qualification, so both read "IAPP Examination Training" — which set was
 * cleared shows in the app beside the certificate, never on the paper.
 */
const designs: Record<ExamType, CertificateDesign> = {
  TRADITIONAL_LIFE: {
    title: "Traditional Life Examination Training",
    slug: "traditional-life",
    titleSize: "3.2cqw",
  },
  VUL: {
    title: "Variable Life Insurance Examination Training",
    slug: "variable-life",
    titleSize: "2.8cqw",
  },
  IIAP_A: {
    title: "IAPP Examination Training",
    slug: "iapp",
    titleSize: "3.5cqw",
  },
  IIAP_B: {
    title: "IAPP Examination Training",
    slug: "iapp",
    titleSize: "3.5cqw",
  },
};

export const certificateDesign = (examType: ExamType): CertificateDesign =>
  designs[examType];

/** The unchanging body text. Held here so the drawn fallback and any future
 *  artwork revision cannot end up saying two different things. */
export const CERTIFICATE_BLURB =
  "For Completing the Training and Practice Exam for the upcoming Insurance " +
  "Commission Examination to be held in Iloilo City, Philippines.";

export const CERTIFICATE_SIGNER = "MARK ALEXIS TUBURAN";
export const CERTIFICATE_SIGNER_ROLE = "Sales Manager";
