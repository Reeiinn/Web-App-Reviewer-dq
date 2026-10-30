import { z } from "zod";
import { isExamType, type ExamType } from "@/lib/types/common";
import type { ExamResults, LicensingOutcome } from "@/lib/types/exam-results";

/**
 * The rules around recording how a reviewee did on the real licensing exam.
 *
 * Who may mark whom follows the roster: a Sales Manager reaches everyone, a
 * Unit Manager only their own recruits. The routes enforce it with these, so
 * hiding a chip in the UI is never the only thing standing in the way.
 */

/** A staff account acting from the console. */
export type Actor = { id: string; role: "ADMIN" | "MANAGER" };

/**
 * The reviewee being marked; undefined when no live account has that id.
 * examTracks is their focus pick, null while they have not made one.
 */
export type MarkTarget =
  | { role: string; managerId: string | null; examTracks: ExamType[] | null }
  | undefined;

type Refusal = { ok: false; status: 403 | 404 | 409; error: string };

export function canMarkResult(
  actor: Actor,
  target: MarkTarget,
  examType: ExamType,
): { ok: true } | Refusal {
  if (!target) {
    return { ok: false, status: 404, error: "That reviewee no longer exists." };
  }
  if (target.role !== "USER") {
    return {
      ok: false,
      status: 403,
      error: "Only reviewee accounts have exam results.",
    };
  }
  if (actor.role === "MANAGER" && target.managerId !== actor.id) {
    return {
      ok: false,
      status: 403,
      error: "You can only mark reviewees you manage.",
    };
  }
  // A result has to belong to an exam the reviewee is actually taking, or it
  // would sit on a track that appears nowhere on their side of the app.
  if (!target.examTracks?.includes(examType)) {
    return {
      ok: false,
      status: 409,
      error: "This reviewee isn't taking that exam.",
    };
  }
  return { ok: true };
}

/** A mark as the console sends it. A null outcome clears the mark. */
export const resultMarkSchema = z.object({
  examType: z.custom<ExamType>((value) => isExamType(value), "Unknown track"),
  outcome: z.enum(["PASSED", "FAILED"]).nullable(),
});

/**
 * The results page's headline counts.
 *
 * "Unmarked" is the work still to do: an exam a reviewee chose with no result
 * against it yet. A reviewee who has not chosen has no exams to count.
 */
export function resultTotals(
  rows: { examTracks: ExamType[] | null; results: ExamResults }[],
): { passed: number; failed: number; unmarked: number } {
  const totals = { passed: 0, failed: 0, unmarked: 0 };
  for (const { examTracks, results } of rows) {
    for (const track of examTracks ?? []) {
      const outcome = results[track];
      if (outcome === "PASSED") totals.passed += 1;
      else if (outcome === "FAILED") totals.failed += 1;
      else totals.unmarked += 1;
    }
  }
  return totals;
}

export const PASSED_LOCK_MESSAGE =
  "You've passed this exam. Past sittings stay available to review.";

/**
 * Whether new practice sittings are closed on an exam.
 *
 * A pass on the real exam makes the track view-only. A fail closes nothing:
 * that reviewee is preparing for the retake and needs every sitting they can get.
 */
export const practiceLocked = (outcome: LicensingOutcome | undefined) =>
  outcome === "PASSED";

/** What a practice route answers once the real exam is passed. */
export const PASSED_LOCK_BODY = { error: PASSED_LOCK_MESSAGE, licensed: true };
