import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  auth,
  findActiveAccount,
  recordAdminAction,
  touchLastSeen,
  getFocusTracks,
  markResult,
  clearResult,
  resultsFor,
} = vi.hoisted(() => ({
  auth: vi.fn(),
  findActiveAccount: vi.fn(),
  recordAdminAction: vi.fn(),
  touchLastSeen: vi.fn(),
  getFocusTracks: vi.fn(),
  markResult: vi.fn(),
  clearResult: vi.fn(),
  resultsFor: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/staff", () => ({ findActiveAccount, recordAdminAction, touchLastSeen }));
vi.mock("@/server/data/focus-tracks", () => ({ getFocusTracks }));
vi.mock("@/server/data/exam-results", () => ({ markResult, clearResult, resultsFor }));

import { PUT } from "./route";

const reviewee = { id: "r1", name: "Rae", email: "r@example.test", role: "USER", managerId: "m1" };
const mark = { outcome: "PASSED", markedAt: "2026-10-30T00:00:00.000Z", markedBy: "Ann", markedByRole: "ADMIN" };

async function put(body: string, id = "r1") {
  const response = await PUT(
    new Request(`http://internal.local/api/admin/reviewees/${id}/results`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    }),
    { params: Promise.resolve({ id }) },
  );
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "admin", role: "ADMIN", email: "a@example.test" } });
  findActiveAccount.mockResolvedValue(reviewee);
  getFocusTracks.mockResolvedValue({ tracks: ["VUL", "IIAP_A"], chosen: true });
  markResult.mockResolvedValue(null);
  clearResult.mockResolvedValue("FAILED");
  resultsFor.mockResolvedValue(new Map([["r1", { VUL: mark }]]));
});

describe("PUT /api/admin/reviewees/[id]/results", () => {
  it("answers 401 when signed out", async () => {
    auth.mockResolvedValue(null);
    expect((await put(`{"examType":"VUL","outcome":"PASSED"}`)).status).toBe(401);
  });

  it("refuses a reviewee", async () => {
    auth.mockResolvedValue({ user: { id: "r9", role: "USER" } });
    expect((await put(`{"examType":"VUL","outcome":"PASSED"}`)).status).toBe(403);
    expect(markResult).not.toHaveBeenCalled();
  });

  it.each([
    "not json",
    `{"examType":"IIAP","outcome":"PASSED"}`,
    `{"examType":"VUL","outcome":"MAYBE"}`,
    `{"outcome":"PASSED"}`,
  ])("answers 400 to %s and records nothing", async (body) => {
    expect((await put(body)).status).toBe(400);
    expect(markResult).not.toHaveBeenCalled();
    expect(clearResult).not.toHaveBeenCalled();
  });

  it("records a pass, audits what it replaced and answers the row's marks", async () => {
    markResult.mockResolvedValue("FAILED");
    const { status, body } = await put(`{"examType":"VUL","outcome":"PASSED"}`);

    expect(status).toBe(200);
    expect(body).toEqual({ results: { VUL: mark } });
    expect(markResult).toHaveBeenCalledWith({
      userId: "r1",
      examType: "VUL",
      outcome: "PASSED",
      markedBy: "admin",
    });
    expect(recordAdminAction).toHaveBeenCalledWith({
      actor: { id: "admin", email: "a@example.test", role: "ADMIN" },
      action: "reviewee.result_marked",
      target: { id: "r1", email: "r@example.test", name: "Rae" },
      detail: { examType: "VUL", outcome: "PASSED", previous: "FAILED" },
    });
  });

  it("clears a mark and audits it as cleared", async () => {
    const { status } = await put(`{"examType":"VUL","outcome":null}`);

    expect(status).toBe(200);
    expect(clearResult).toHaveBeenCalledWith("r1", "VUL");
    expect(markResult).not.toHaveBeenCalled();
    expect(recordAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "reviewee.result_cleared",
        detail: { examType: "VUL", outcome: null, previous: "FAILED" },
      }),
    );
  });

  it("clears a mark left on an exam outside the pick", async () => {
    expect((await put(`{"examType":"IIAP_B","outcome":null}`)).status).toBe(200);
    expect(clearResult).toHaveBeenCalledWith("r1", "IIAP_B");
  });

  it("records nothing when there was no mark to clear", async () => {
    clearResult.mockResolvedValue(null);
    expect((await put(`{"examType":"VUL","outcome":null}`)).status).toBe(200);
    expect(recordAdminAction).not.toHaveBeenCalled();
  });

  it("lets a unit manager mark their own recruit", async () => {
    auth.mockResolvedValue({ user: { id: "m1", role: "MANAGER", email: "m@example.test" } });
    expect((await put(`{"examType":"VUL","outcome":"FAILED"}`)).status).toBe(200);
  });

  it("stops a unit manager marking someone else's recruit", async () => {
    auth.mockResolvedValue({ user: { id: "m2", role: "MANAGER", email: "n@example.test" } });
    const { status, body } = await put(`{"examType":"VUL","outcome":"FAILED"}`);
    expect(status).toBe(403);
    expect(body).toEqual({ error: "You can only mark reviewees you manage." });
    expect(markResult).not.toHaveBeenCalled();
  });

  it("answers 404 for an account that is gone", async () => {
    findActiveAccount.mockResolvedValue(null);
    expect((await put(`{"examType":"VUL","outcome":"PASSED"}`)).status).toBe(404);
  });

  it("refuses a staff account", async () => {
    findActiveAccount.mockResolvedValue({ ...reviewee, role: "MANAGER" });
    expect((await put(`{"examType":"VUL","outcome":"PASSED"}`)).status).toBe(403);
  });

  it("refuses an exam the reviewee did not pick", async () => {
    expect((await put(`{"examType":"IIAP_B","outcome":"PASSED"}`)).status).toBe(409);
    expect(markResult).not.toHaveBeenCalled();
  });

  // No pick yet means all four are only a default: nothing has been chosen
  // for a result to belong to.
  it("refuses a reviewee who has not picked yet", async () => {
    getFocusTracks.mockResolvedValue({ tracks: ["VUL", "TRADITIONAL_LIFE", "IIAP_A", "IIAP_B"], chosen: false });
    expect((await put(`{"examType":"VUL","outcome":"PASSED"}`)).status).toBe(409);
  });

  it("answers 500 when saving fails", async () => {
    markResult.mockRejectedValue(new Error("db down"));
    expect((await put(`{"examType":"VUL","outcome":"PASSED"}`)).status).toBe(500);
  });
});
