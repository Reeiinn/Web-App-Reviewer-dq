import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  auth,
  findMemorizationTrack,
  memorizationChoiceCorrectness,
  recordMemorizationAnswer,
  applyStreak,
} = vi.hoisted(() => ({
  auth: vi.fn(),
  findMemorizationTrack: vi.fn(),
  memorizationChoiceCorrectness: vi.fn(),
  recordMemorizationAnswer: vi.fn(),
  applyStreak: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/progress", () => ({
  findMemorizationTrack,
  memorizationChoiceCorrectness,
  recordMemorizationAnswer,
  applyStreak,
}));

import { POST } from "./route";

const streak = { current: 0, best: 4, isNewBest: false, milestone: null };
const body = { selected_choice_id: "c1" };
const post = (payload: unknown = body) =>
  POST(
    new Request("http://internal.local/api/memorization/m1/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
    { params: Promise.resolve({ id: "m1" }) },
  );

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  findMemorizationTrack.mockResolvedValue("IIAP_A");
  memorizationChoiceCorrectness.mockResolvedValue(false);
  recordMemorizationAnswer.mockResolvedValue({
    id: "p1",
    userId: "u1",
    memorizationId: "m1",
    selectedChoiceId: "c1",
    isCorrect: false,
    reviewedAt: new Date("2026-10-14T09:00:00.000Z"),
    mastered: true,
  });
  applyStreak.mockResolvedValue(streak);
});

describe("POST /api/memorization/[id]/progress", () => {
  it("answers with the saved answer in today's snake_case shape", async () => {
    const response = await post();

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(
      JSON.stringify({
        id: "p1",
        user_id: "u1",
        memorization_id: "m1",
        selected_choice_id: "c1",
        is_correct: false,
        reviewed_at: "2026-10-14T09:00:00.000Z",
        mastered: true,
        streak,
      }),
    );
    expect(recordMemorizationAnswer).toHaveBeenCalledWith({
      userId: "u1",
      memorizationId: "m1",
      selectedChoiceId: "c1",
      isCorrect: false,
      mastered: false,
    });
    expect(applyStreak).toHaveBeenCalledWith("u1", "IIAP_A", false);
  });

  it("marks the answer itself, whatever the client claims", async () => {
    await post({ selected_choice_id: "c1", is_correct: true, mastered: true });
    expect(recordMemorizationAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ isCorrect: false, mastered: false }),
    );
    expect(applyStreak).toHaveBeenCalledWith("u1", "IIAP_A", false);
  });

  it("masters an item on a right answer", async () => {
    memorizationChoiceCorrectness.mockResolvedValue(true);
    await post();
    expect(recordMemorizationAnswer).toHaveBeenCalledWith(
      expect.objectContaining({ isCorrect: true, mastered: true }),
    );
  });

  it("answers 400 without a choice", async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ selected_choice_id: 7 })).status).toBe(400);
  });

  it("answers 404 for an unknown item", async () => {
    findMemorizationTrack.mockResolvedValue(null);
    const response = await post();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Memorization item not found" });
  });

  it("answers 404 for another item's choice", async () => {
    memorizationChoiceCorrectness.mockResolvedValue(null);
    const response = await post();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Choice not found for this memorization item" });
    expect(recordMemorizationAnswer).not.toHaveBeenCalled();
  });
});
