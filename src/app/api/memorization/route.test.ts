import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, listMemorization } = vi.hoisted(() => ({
  auth: vi.fn(),
  listMemorization: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/content", () => ({ listMemorization }));

import { GET } from "./route";

const get = (query = "") =>
  GET(new Request(`http://internal.local/api/memorization${query}`));

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  listMemorization.mockResolvedValue([{ id: "m1" }]);
});

describe("GET /api/memorization", () => {
  it("answers 401 without a session", async () => {
    auth.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
  });

  it("answers 400 for an unknown track without querying", async () => {
    const response = await get("?exam_type=FOO");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "exam_type is invalid" });
    expect(listMemorization).not.toHaveBeenCalled();
  });

  it("reads the signed-in learner's items", async () => {
    const response = await get("?exam_type=VUL&category=Basics");
    expect(await response.json()).toEqual([{ id: "m1" }]);
    expect(listMemorization).toHaveBeenCalledWith("u1", { examType: "VUL", category: "Basics" });
  });
});
