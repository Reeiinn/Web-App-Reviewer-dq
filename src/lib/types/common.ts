export type ExamType = "VUL" | "TRADITIONAL_LIFE" | "IIAP";

export const examTypes: readonly ExamType[] = [
  "VUL",
  "TRADITIONAL_LIFE",
  "IIAP",
];

export const examLabels: Record<ExamType, string> = {
  VUL: "VUL",
  TRADITIONAL_LIFE: "Traditional Life",
  IIAP: "IIAP",
};
