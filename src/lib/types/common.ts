export type ExamType = "VUL" | "TRADITIONAL_LIFE" | "IIAP_A" | "IIAP_B";

export const examTypes: readonly ExamType[] = [
  "VUL",
  "TRADITIONAL_LIFE",
  "IIAP_A",
  "IIAP_B",
];

export const examLabels: Record<ExamType, string> = {
  VUL: "VUL",
  TRADITIONAL_LIFE: "Traditional Life",
  IIAP_A: "IIAP (Set A)",
  IIAP_B: "IIAP (Set B)",
};

/**
 * Reads a track off a URL, falling back to VUL.
 *
 * The study pages used to compare against TRADITIONAL_LIFE by hand and treat
 * everything else as VUL, so any track added after those two was served the
 * VUL deck instead of its own.
 */
export function parseExamType(value: string | null | undefined): ExamType {
  return examTypes.includes(value as ExamType) ? (value as ExamType) : "VUL";
}
