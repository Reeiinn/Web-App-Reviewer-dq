import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, listQuestions, outcomeFor, sittingStanding } = vi.hoisted(() => ({
  auth: vi.fn(),
  listQuestions: vi.fn(),
  outcomeFor: vi.fn(),
  sittingStanding: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/content", () => ({ listQuestions }));
vi.mock("@/server/data/exam-results", () => ({ outcomeFor }));
vi.mock("@/server/data/attempts", () => ({ sittingStanding }));
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import { GET } from "./route";

const key = [
  { id: "q1", choices: [{ id: "a", text: "A", is_correct: true }] },
];

const get = (query = "?exam_type=VUL") =>
  GET(new Request(`http://internal.local/api/questions/answers${query}`));

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  outcomeFor.mockResolvedValue(undefined);
  sittingStanding.mockResolvedValue({ openSitting: false, finishedSittings: 1 });
  listQuestions.mockResolvedValue(key);
});

describe("GET /api/questions/answers", () => {
  it("answers 401 without a session", async () => {
    auth.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
  });

  it("wants a real track", async () => {
    expect((await get("")).status).toBe(400);
    expect((await get("?exam_type=FOO")).status).toBe(400);
    expect(listQuestions).not.toHaveBeenCalled();
  });

  it("returns the key once a sitting is finished", async () => {
    const response = await get();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(key);
    expect(listQuestions).toHaveBeenCalledWith({ examType: "VUL", category: null });
  });

  it("refuses while a sitting is open", async () => {
    sittingStanding.mockResolvedValue({ openSitting: true, finishedSittings: 3 });
    expect((await get()).status).toBe(403);
    expect(listQuestions).not.toHaveBeenCalled();
  });

  it("refuses before the first sitting", async () => {
    sittingStanding.mockResolvedValue({ openSitting: false, finishedSittings: 0 });
    expect((await get()).status).toBe(403);
  });

  it("opens to a reviewee marked Passed, but not one marked Failed", async () => {
    sittingStanding.mockResolvedValue({ openSitting: true, finishedSittings: 0 });

    outcomeFor.mockResolvedValue("PASSED");
    expect((await get()).status).toBe(200);

    outcomeFor.mockResolvedValue("FAILED");
    expect((await get()).status).toBe(403);
  });
});
