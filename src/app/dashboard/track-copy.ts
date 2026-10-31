import type { ExamType } from "@/lib/types/common";

/**
 * How each exam introduces itself. Shared by the dashboard's track cards and
 * the exam picker, so a reviewee choosing an exam reads the same words they
 * will see on its card.
 */
export const trackCopy: Record<ExamType, { title: string; blurb: string }> = {
  VUL: {
    title: "VUL (Variable Universal Life)",
    blurb: "Master the complexities of investment-linked insurance.",
  },
  TRADITIONAL_LIFE: {
    title: "Traditional Life",
    blurb: "Core fundamentals of whole and term life insurance.",
  },
  IIAP_A: {
    title: "IIAP (Set A)",
    blurb: "The first IIAP question set, with its own deck and exam.",
  },
  IIAP_B: {
    title: "IIAP (Set B)",
    blurb: "The second IIAP question set, tracked separately from Set A.",
  },
};
