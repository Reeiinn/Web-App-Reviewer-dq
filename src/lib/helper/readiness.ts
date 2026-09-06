export type ReadinessStatus = "EXAM_READY" | "ON_TRACK" | "AT_RISK";

export const EXAM_READY_THRESHOLD = 90;
export const ON_TRACK_THRESHOLD = 60;

export const statusLabels: Record<ReadinessStatus, string> = {
  EXAM_READY: "Exam Ready",
  ON_TRACK: "On Track",
  AT_RISK: "At Risk",
};

/** Tailwind classes for each status pill, matching the admin console design. */
export const statusStyles: Record<ReadinessStatus, string> = {
  EXAM_READY: "border-emerald-300 bg-emerald-50 text-emerald-700",
  ON_TRACK: "border-amber-300 bg-amber-50 text-amber-700",
  AT_RISK: "border-rose-300 bg-rose-50 text-rose-700",
};

export function readinessStatus(readiness: number): ReadinessStatus {
  if (readiness >= EXAM_READY_THRESHOLD) return "EXAM_READY";
  if (readiness >= ON_TRACK_THRESHOLD) return "ON_TRACK";
  return "AT_RISK";
}
