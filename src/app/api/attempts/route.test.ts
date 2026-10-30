import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, fetchEligibility, openAttempt } = vi.hoisted(() => ({
  auth: vi.fn(),
  fetchEligibility: vi.fn(),
  openAttempt: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/app/api/_lib/mastery", () => ({ fetchEligibility }));
vi.mock("@/server/data/attempts", () => ({ openAttempt }));

import * as route from "./route";

const attempt = {
  id: "a1",
  userId: "u1",
  examType: "VUL",
  score: 0,
  totalItems: 0,
  passed: false,
  startedAt: new Date("2026-10-14T01:00:00.000Z"),
  completedAt: null,
  questionOrder: ["q2", "q1"],
};
const ATTEMPT_JSON =
  '{"id":"a1","user_id":"u1","exam_type":"VUL","score":0,"total_items":0,"passed":false,' +
  '"started_at":"2026-10-14T01:00:00.000Z","completed_at":null,"question_order":["q2","q1"]}';

const eligible = {
  eligible: true,
  flashcards: { mastered: 10, total: 10 },
  memorization: { mastered: 10, total: 10 },
};

const post = (body: unknown) =>
  route.POST(
    new Request("http://internal.local/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  fetchEligibility.mockResolvedValue(eligible);
  openAttempt.mockResolvedValue({ attempt, created: true });
});

describe("POST /api/attempts", () => {
  it("answers 201 with a new sitting in exam_attempts' shape", async () => {
    const response = await post({ exam_type: "VUL" });

    expect(response.status).toBe(201);
    expect(await response.text()).toBe(ATTEMPT_JSON);
    expect(openAttempt).toHaveBeenCalledWith("u1", "VUL");
  });

  it("answers 200 when the open sitting is resumed", async () => {
    openAttempt.mockResolvedValue({ attempt, created: false });

    const response = await post({ exam_type: "VUL" });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(ATTEMPT_JSON);
  });

  it("answers 403 with the reason and the counts when the track is locked", async () => {
    const locked = {
      eligible: false,
      flashcards: { mastered: 1, total: 58 },
      memorization: { mastered: 0, total: 58 },
    };
    fetchEligibility.mockResolvedValue(locked);

    const response = await post({ exam_type: "VUL" });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.eligibility).toEqual(locked);
    expect(typeof body.error).toBe("string");
    expect(openAttempt).not.toHaveBeenCalled();
  });

  it("answers 400 without an exam_type, and for one that is not a track", async () => {
    expect((await post({})).status).toBe(400);
    const invalid = await post({ exam_type: "IIAP" });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({ error: "exam_type is invalid" });
    expect(openAttempt).not.toHaveBeenCalled();
  });

  it("answers 401 without a session", async () => {
    auth.mockResolvedValue(null);
    expect((await post({ exam_type: "VUL" })).status).toBe(401);
  });
});

describe("GET /api/attempts", () => {
  it("is gone: nothing called it", () => {
    expect(route).not.toHaveProperty("GET");
  });
});
