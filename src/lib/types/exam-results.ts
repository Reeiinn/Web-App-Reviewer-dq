import type { ExamType } from "./common";

/**
 * How a reviewee did on the real licensing exam, sat outside this app.
 *
 * Deliberately apart from the practice exam's own pass: that one is earned in
 * here at 75% over five sittings, while this one is recorded by staff after the
 * licensing body reports a result. Neither is allowed to stand in for the other.
 */
export type LicensingOutcome = "PASSED" | "FAILED";

/** One reviewee's recorded outcomes, keyed by exam. An absent key is unmarked. */
export type ExamResults = Partial<Record<ExamType, LicensingOutcome>>;

/** A recorded outcome with who recorded it, for the staff screens. */
export type ResultMark = {
  outcome: LicensingOutcome;
  markedAt: string;
  /** The marker's display name, null once their account is gone. */
  markedBy: string | null;
};
