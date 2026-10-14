import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getTrackCount } = vi.hoisted(() => ({
  auth: vi.fn(),
  getTrackCount: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/mastery", () => ({ getTrackCount }));

import { buildTrackCounts } from "@/lib/helper/track-counts";
import { GET } from "./route";

const get = (query: string) =>
  GET(new Request(`http://internal.local/api/flashcards/eligibility${query}`));

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
});

describe("GET /api/flashcards/eligibility", () => {
  it("still requires exam_type", async () => {
    expect((await get("")).status).toBe(400);
  });

  it("answers 400 for an unknown track", async () => {
    expect((await get("?exam_type=FOO")).status).toBe(400);
    expect(getTrackCount).not.toHaveBeenCalled();
  });

  it("keeps its own response shape", async () => {
    getTrackCount.mockResolvedValue(
      buildTrackCounts(
        "VUL",
        { exam_type: "VUL", flashcards: 2, memorization: 0, questions: 0 },
        {
          user_id: "u1", exam_type: "VUL", flashcards_mastered: 2, memorization_mastered: 0,
          memorization_answered: 0, memorization_correct: 0, questions_mastered: 0,
          attempts_taken: 0, passing_attempts: 0, last_reviewed_at: null, last_answer_at: null,
        },
      ),
    );
    expect(await (await get("?exam_type=VUL")).json()).toEqual({
      eligible: true,
      total: 2,
      mastered: 2,
    });
  });
});
