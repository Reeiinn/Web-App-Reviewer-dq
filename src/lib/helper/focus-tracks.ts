import { z } from "zod";
import { examTypes, isExamType, type ExamType } from "@/lib/types/common";

/** The tracks a reviewee's summaries cover, and whether they picked them. */
export type FocusTracks = { tracks: ExamType[]; chosen: boolean };

/**
 * Saved rows to the tracks in effect. Nothing saved means all four: that is
 * every existing account and every new one until a pick is made, and it is
 * never written down as rows. Tracks come back in the standard order whatever
 * order they were picked in.
 */
export function resolveFocusTracks(saved: readonly string[]): FocusTracks {
  const picked = examTypes.filter((track) => saved.includes(track));
  return picked.length > 0
    ? { tracks: picked, chosen: true }
    : { tracks: [...examTypes], chosen: false };
}

/** Body of PUT /api/user/focus-tracks. */
export const focusTracksBody = z.object({
  tracks: z
    .array(z.custom<ExamType>((value) => isExamType(value), "Unknown track"))
    .min(1, "Pick at least one track")
    .max(examTypes.length, "There are only four tracks")
    .refine(
      (tracks) => new Set(tracks).size === tracks.length,
      "Each track can be picked once",
    ),
});

/** The first validation message, for the `{ error }` every route answers with. */
export const firstIssue = (error: z.ZodError) =>
  error.issues[0]?.message ?? "Invalid request body";
