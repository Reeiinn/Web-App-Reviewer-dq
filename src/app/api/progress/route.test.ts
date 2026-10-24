import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getTrackCounts, getFocusTracks } = vi.hoisted(() => ({
  auth: vi.fn(),
  getTrackCounts: vi.fn(),
  getFocusTracks: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/mastery", () => ({ getTrackCounts }));
vi.mock("@/server/data/focus-tracks", () => ({ getFocusTracks }));

import { buildTrackCounts } from "@/lib/helper/track-counts";
import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  getFocusTracks.mockResolvedValue({
    tracks: ["VUL", "TRADITIONAL_LIFE", "IIAP_A", "IIAP_B"],
    chosen: false,
  });
});

describe("GET /api/progress", () => {
  it("lists only the reviewee's focus tracks", async () => {
    getFocusTracks.mockResolvedValue({ tracks: ["IIAP_A"], chosen: true });
    getTrackCounts.mockResolvedValue([
      buildTrackCounts("VUL", { exam_type: "VUL", flashcards: 1, memorization: 0, questions: 0 }, undefined),
      buildTrackCounts("IIAP_A", { exam_type: "IIAP_A", flashcards: 1, memorization: 0, questions: 0 }, undefined),
    ]);
    const body = await (await GET()).json();
    expect(body.map((row: { exam_type: string }) => row.exam_type)).toEqual(["IIAP_A"]);
  });

  it("refuses a caller who is not signed in", async () => {
    auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it("keeps the old arithmetic and response shape exactly", async () => {
    // 1/3, 2/3, 0/0 → 33.33 + 66.67 + 0, averaged unrounded → 33.
    getTrackCounts.mockResolvedValue([
      buildTrackCounts(
        "VUL",
        { exam_type: "VUL", flashcards: 3, memorization: 3, questions: 0 },
        {
          user_id: "u1", exam_type: "VUL", flashcards_mastered: 1, memorization_mastered: 2,
          memorization_answered: 2, memorization_correct: 2, questions_mastered: 0,
          attempts_taken: 7, passing_attempts: 7,
          last_reviewed_at: new Date("2026-10-14T09:00:00Z"), last_answer_at: null,
        },
      ),
    ]);
    expect(await (await GET()).json()).toEqual([
      {
        exam_type: "VUL",
        last_activity_at: "2026-10-14T09:00:00.000Z",
        flashcard_pct: 33,
        memorize_pct: 67,
        practice_exam_pct: 0,
        overall_pct: 33,
        exam_passes: 5,
        passes_required: 5,
      },
    ]);
  });

  it("reports no activity as null", async () => {
    getTrackCounts.mockResolvedValue([
      buildTrackCounts("IIAP_A", { exam_type: "IIAP_A", flashcards: 1, memorization: 0, questions: 0 }, undefined),
    ]);
    const [row] = await (await GET()).json();
    expect(row.last_activity_at).toBeNull();
    expect(row.overall_pct).toBe(0);
  });
});
