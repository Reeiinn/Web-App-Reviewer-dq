import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, listQuestions } = vi.hoisted(() => ({
  auth: vi.fn(),
  listQuestions: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/content", () => ({ listQuestions }));
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import { GET } from "./route";

const get = (query = "") =>
  GET(new Request(`http://internal.local/api/questions${query}`));

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  listQuestions.mockResolvedValue([{ id: "f1" }]);
});

describe("GET /api/questions", () => {
  it("answers 401 without a session", async () => {
    auth.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
  });

  it("answers 400 for an unknown track without querying", async () => {
    const response = await get("?exam_type=FOO");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "exam_type is invalid" });
    expect(listQuestions).not.toHaveBeenCalled();
  });

  it("passes the track and category through and returns the rows", async () => {
    const response = await get("?exam_type=VUL&category=Basics");
    expect(await response.json()).toEqual([{ id: "f1" }]);
    expect(listQuestions).toHaveBeenCalledWith({ examType: "VUL", category: "Basics" });
  });

  it("lists every track when none is asked for", async () => {
    await get();
    expect(listQuestions).toHaveBeenCalledWith({ examType: null, category: null });
  });
});
