import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, findAttempt, listAttemptAnswers, isActiveRecruit } = vi.hoisted(() => ({
  auth: vi.fn(),
  findAttempt: vi.fn(),
  listAttemptAnswers: vi.fn(),
  isActiveRecruit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/attempts", () => ({ findAttempt, listAttemptAnswers }));
vi.mock("@/server/data/users", () => ({ isActiveRecruit }));

import { GET } from "./route";

const attempt = {
  id: "a1",
  userId: "owner",
  examType: "VUL",
  score: 0,
  totalItems: 0,
  passed: false,
  startedAt: new Date("2026-10-14T01:00:00.000Z"),
  completedAt: null,
  questionOrder: ["q1"],
};

const get = () =>
  GET(new Request("http://internal.local/api/attempts/a1"), {
    params: Promise.resolve({ id: "a1" }),
  });
const as = (id: string, role: "USER" | "MANAGER" | "ADMIN") =>
  auth.mockResolvedValue({ user: { id, role } });

beforeEach(() => {
  vi.clearAllMocks();
  as("owner", "USER");
  findAttempt.mockResolvedValue(attempt);
  listAttemptAnswers.mockResolvedValue([
    { id: "x1", questionId: "q1", selectedChoiceId: "c1", isCorrect: true, questionText: "Q?" },
  ]);
  isActiveRecruit.mockResolvedValue(false);
});

describe("GET /api/attempts/[id]", () => {
  it("answers the owner with the attempt and its answers", async () => {
    const response = await get();

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(
      '{"id":"a1","user_id":"owner","exam_type":"VUL","score":0,"total_items":0,"passed":false,' +
        '"started_at":"2026-10-14T01:00:00.000Z","completed_at":null,"question_order":["q1"],' +
        '"answers":[{"id":"x1","question_id":"q1","selected_choice_id":"c1","is_correct":true,"question_text":"Q?"}]}',
    );
  });

  it("answers 404 for an attempt that does not exist", async () => {
    findAttempt.mockResolvedValue(null);
    const response = await get();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Attempt not found" });
  });

  it("answers 403 to another learner", async () => {
    as("someone-else", "USER");
    expect((await get()).status).toBe(403);
    expect(listAttemptAnswers).not.toHaveBeenCalled();
  });

  it("lets the owner's active manager in, and no other manager", async () => {
    as("manager", "MANAGER");
    isActiveRecruit.mockResolvedValue(true);
    expect((await get()).status).toBe(200);
    expect(isActiveRecruit).toHaveBeenCalledWith("owner", "manager");

    isActiveRecruit.mockResolvedValue(false);
    expect((await get()).status).toBe(403);
  });

  it("lets a manager read their own attempt", async () => {
    as("owner", "MANAGER");
    expect((await get()).status).toBe(200);
  });

  it("lets an admin read any attempt", async () => {
    as("admin", "ADMIN");
    expect((await get()).status).toBe(200);
  });

  it("answers 401 without a session", async () => {
    auth.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
  });
});
