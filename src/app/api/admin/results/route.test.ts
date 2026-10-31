import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, listReviewees, touchLastSeen, getFocusTracksFor, resultsFor } = vi.hoisted(() => ({
  auth: vi.fn(),
  listReviewees: vi.fn(),
  touchLastSeen: vi.fn(),
  getFocusTracksFor: vi.fn(),
  resultsFor: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/staff", () => ({ listReviewees, touchLastSeen }));
vi.mock("@/server/data/focus-tracks", () => ({ getFocusTracksFor }));
vi.mock("@/server/data/exam-results", () => ({ resultsFor }));

import { GET } from "./route";

const person = (id: string) => ({ id, name: id.toUpperCase(), email: `${id}@example.test`, image: null, manager: null });
const mark = (outcome: string, markedAt: string) => ({ outcome, markedAt, markedBy: "Ann", markedByRole: "ADMIN" });

const results = async (query = "") => {
  const response = await GET(new Request(`http://internal.local/api/admin/results${query}`));
  return { status: response.status, body: await response.json() };
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
  listReviewees.mockResolvedValue([person("a"), person("b"), person("c")]);
  getFocusTracksFor.mockResolvedValue(new Map([
    ["a", { tracks: ["VUL", "IIAP_A"], chosen: true }],
    ["b", { tracks: ["IIAP_B"], chosen: true }],
    ["c", { tracks: ["VUL", "TRADITIONAL_LIFE", "IIAP_A", "IIAP_B"], chosen: false }],
  ]));
  resultsFor.mockResolvedValue(new Map([
    ["a", { VUL: mark("PASSED", "2026-10-01T00:00:00.000Z") }],
    ["b", { IIAP_B: mark("FAILED", "2026-10-05T00:00:00.000Z") }],
  ]));
});

describe("GET /api/admin/results", () => {
  it("answers 401 when signed out", async () => {
    auth.mockResolvedValue(null);
    expect((await results()).status).toBe(401);
  });

  it("refuses a reviewee", async () => {
    auth.mockResolvedValue({ user: { id: "a", role: "USER" } });
    expect((await results()).status).toBe(403);
    expect(listReviewees).not.toHaveBeenCalled();
  });

  it("lists every mark, newest first, with totals over picked exams", async () => {
    const { status, body } = await results();

    expect(status).toBe(200);
    expect(body.rows.map((row: { revieweeId: string; examType: string }) => `${row.revieweeId} ${row.examType}`))
      .toEqual(["b IIAP_B", "a VUL"]);
    expect(body.rows[1]).toEqual({
      revieweeId: "a",
      name: "A",
      email: "a@example.test",
      image: null,
      examType: "VUL",
      outcome: "PASSED",
      markedBy: "Ann",
      markedByRole: "ADMIN",
      markedAt: "2026-10-01T00:00:00.000Z",
    });
    // a: VUL passed, IIAP_A unmarked. b: failed. c has not picked, so counts nothing.
    expect(body.totals).toEqual({ passed: 1, failed: 1, unmarked: 1 });
  });

  it("filters by result and by exam, leaving the totals whole", async () => {
    expect((await results("?outcome=FAILED")).body.rows).toHaveLength(1);
    expect((await results("?exam_type=VUL")).body.rows[0].revieweeId).toBe("a");
    const { body } = await results("?outcome=PASSED&exam_type=IIAP_B");
    expect(body.rows).toEqual([]);
    expect(body.totals).toEqual({ passed: 1, failed: 1, unmarked: 1 });
  });

  it("ignores a filter it does not know", async () => {
    expect((await results("?outcome=MAYBE&exam_type=IIAP")).body.rows).toHaveLength(2);
  });

  it("scopes a unit manager to their own recruits", async () => {
    auth.mockResolvedValue({ user: { id: "m1", role: "MANAGER" } });
    await results();
    expect(listReviewees).toHaveBeenCalledWith("m1");
  });

  it("answers 500 when reading fails", async () => {
    resultsFor.mockRejectedValue(new Error("db down"));
    expect((await results()).status).toBe(500);
  });
});
