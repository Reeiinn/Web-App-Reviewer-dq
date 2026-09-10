import type { ExamType } from "./common";

/**
 * A worked example of a term.
 *
 * `label` names the side of a contrast being illustrated ("Revocable",
 * "Non-Participating"), so a term with two examples says which is which.
 * `roles` carries an example that is a cast rather than a sentence — who owns
 * the policy, who applied, who is insured — and `note` closes it off.
 */
export interface GlossaryExample {
  label?: string;
  text: string;
  roles?: { role: string; who: string }[];
  note?: string;
}

/** One point, with the question-and-answer pairs that hang off it. */
export interface GlossaryKeyPoint {
  text: string;
  children?: string[];
}

/** A feature-by-feature contrast, rendered as a table rather than a sentence. */
export interface GlossaryComparison {
  /** The feature column's heading first, then one heading per side. */
  columns: string[];
  rows: { feature: string; values: string[] }[];
}

/**
 * The structured half of a term.
 *
 * Every field is optional: most terms are a definition and nothing else, and
 * those render as a definition rather than as a card full of empty headings.
 */
export interface GlossaryDetails {
  /** Names the list when "Key points" is not what it is — e.g. "Differences". */
  keyPointsLabel?: string;
  keyPoints?: GlossaryKeyPoint[];
  similarities?: string[];
  comparison?: GlossaryComparison;
  examples?: GlossaryExample[];
}

export interface GlossaryTerm {
  id: string;
  exam_type: ExamType;
  term: string;
  definition: string;
  details: GlossaryDetails | null;
}
