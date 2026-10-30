/**
 * What the practice exam page opens on, and how it reads a finished sitting.
 *
 * Two gates meet on that page: the study lock (decks not yet mastered) and the
 * licensing lock (the real exam already passed). The licensing lock closes new
 * sittings but never the review, and it is decided first, so a passer is told
 * they passed rather than that their decks are unfinished.
 */

export function practiceEntry({
  passed,
  reviewing,
  eligible,
}: {
  /** Staff have recorded a pass on the real exam. */
  passed: boolean;
  /** The page was opened to read the paper rather than sit it. */
  reviewing: boolean;
  /** Every flashcard and memorization item is mastered. */
  eligible: boolean;
}): "licensed" | "locked" | "open" {
  if (passed) return reviewing ? "open" : "licensed";
  return eligible ? "open" : "locked";
}

export type Completion =
  | { kind: "scored"; passed: boolean; passes: number; certificateId: string | null }
  | { kind: "licensed" }
  | { kind: "error"; message: string };

/**
 * Reads the reply to finishing a sitting.
 *
 * Only a successful reply is a score. A refusal used to be read as one too,
 * with every field missing, so a sitting closed by a pass recorded mid-exam
 * came back as "failed, 0 passes": the opposite of what had happened.
 */
export function readCompletion(ok: boolean, body: unknown): Completion {
  const reply = (body ?? {}) as {
    passed?: boolean;
    passes?: number;
    certificate?: { id?: string } | null;
    licensed?: boolean;
    error?: string;
  };

  if (!ok) {
    if (reply.licensed) return { kind: "licensed" };
    return {
      kind: "error",
      message:
        reply.error ?? "Something went wrong submitting your exam. Please try again.",
    };
  }

  return {
    kind: "scored",
    passed: Boolean(reply.passed),
    passes: Number(reply.passes ?? 0),
    certificateId: reply.certificate?.id ?? null,
  };
}
