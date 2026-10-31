import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, listFinishedAttempts } = vi.hoisted(() => ({
  auth: vi.fn(),
  listFinishedAttempts: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/attempts", () => ({ listFinishedAttempts }));

import { GET } from "./route";

const history = (query: string) =>
  GET(new Request(`http://internal.local/api/attempts/history${query}`));

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  listFinishedAttempts.mockResolvedValue([
    {
      id: "a2",
      score: 38,
      totalItems: 50,
      passed: true,
      completedAt: new Date("2026-10-03T00:00:00.000Z"),
    },
  ]);
});

describe("GET /api/attempts/history", () => {
  it("lists the caller's finished sittings on a track", async () => {
    const response = await history("?exam_type=VUL");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        id: "a2",
        score: 38,
        total_items: 50,
        passed: true,
        completed_at: "2026-10-03T00:00:00.000Z",
      },
    ]);
    expect(listFinishedAttempts).toHaveBeenCalledWith("u1", "VUL");
  });

  it("answers 400 for a missing or unknown track", async () => {
    expect((await history("")).status).toBe(400);
    expect((await history("?exam_type=IIAP")).status).toBe(400);
    expect(listFinishedAttempts).not.toHaveBeenCalled();
  });

  it("answers 401 without a session", async () => {
    auth.mockResolvedValue(null);
    expect((await history("?exam_type=VUL")).status).toBe(401);
  });

  it("answers 500 when reading fails", async () => {
    listFinishedAttempts.mockRejectedValue(new Error("db down"));
    expect((await history("?exam_type=VUL")).status).toBe(500);
  });
});
