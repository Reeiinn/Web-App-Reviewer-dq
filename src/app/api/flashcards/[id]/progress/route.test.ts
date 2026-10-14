import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, findFlashcardTrack, recordFlashcardReview, applyStreak } =
  vi.hoisted(() => ({
    auth: vi.fn(),
    findFlashcardTrack: vi.fn(),
    recordFlashcardReview: vi.fn(),
    applyStreak: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/progress", () => ({
  findFlashcardTrack,
  recordFlashcardReview,
  applyStreak,
}));

import { POST } from "./route";

const streak = { current: 3, best: 3, isNewBest: true, milestone: null };
const post = (body: unknown) =>
  POST(
    new Request("http://internal.local/api/flashcards/f1/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "f1" }) },
  );

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  findFlashcardTrack.mockResolvedValue("VUL");
  recordFlashcardReview.mockResolvedValue({
    id: "p1",
    userId: "u1",
    flashcardId: "f1",
    reviewedAt: new Date("2026-10-14T09:00:00.000Z"),
    mastered: true,
  });
  applyStreak.mockResolvedValue(streak);
});

describe("POST /api/flashcards/[id]/progress", () => {
  it("answers with the saved review in today's snake_case shape", async () => {
    const response = await post({ mastered: true });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(
      JSON.stringify({
        id: "p1",
        user_id: "u1",
        flashcard_id: "f1",
        reviewed_at: "2026-10-14T09:00:00.000Z",
        mastered: true,
        streak,
      }),
    );
    expect(recordFlashcardReview).toHaveBeenCalledWith("u1", "f1", true);
    expect(applyStreak).toHaveBeenCalledWith("u1", "VUL", true);
  });

  it("answers 400 without a boolean mastered", async () => {
    expect((await post({ mastered: "yes" })).status).toBe(400);
    expect(recordFlashcardReview).not.toHaveBeenCalled();
  });

  it("answers 404 for an unknown card", async () => {
    findFlashcardTrack.mockResolvedValue(null);
    const response = await post({ mastered: true });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Flashcard not found" });
  });
});
