import type { ExamType } from "@/lib/types/common";
import { listQuestions } from "@/server/data/content";
import { unstable_cache } from "next/cache";

/**
 * The bank with its answers, cached for both question routes. Only the
 * answer-key route may send this as it stands.
 */
export const getQuestions = unstable_cache(
  async (examType: ExamType | null, category: string | null) =>
    listQuestions({ examType, category }),
  ["questions"],
  { tags: ["questions"] },
);
