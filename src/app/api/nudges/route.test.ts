import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, listNudges, unreadNudgeCount, markNudgesRead } = vi.hoisted(() => ({
  auth: vi.fn(),
  listNudges: vi.fn(),
  unreadNudgeCount: vi.fn(),
  markNudgesRead: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/staff", () => ({ listNudges, unreadNudgeCount, markNudgesRead }));

import { GET, PATCH } from "./route";

const created = new Date("2026-10-14T09:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "r1", role: "USER" } });
  listNudges.mockResolvedValue([
    { id: "n1", senderId: "m1", senderName: "Mae", message: "Keep going", createdAt: created, readAt: null },
  ]);
  unreadNudgeCount.mockResolvedValue(3);
});

const patch = (body?: unknown) =>
  PATCH(new Request("http://internal.local/api/nudges", {
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
  }));

describe("GET /api/nudges", () => {
  it("returns the caller's twenty newest and the unread count, in today's shape", async () => {
    const response = await GET();

    expect(listNudges).toHaveBeenCalledWith("r1", 20);
    expect(unreadNudgeCount).toHaveBeenCalledWith("r1");
    expect(JSON.stringify(await response.json())).toBe(JSON.stringify({
      nudges: [{ id: "n1", sender: "Mae", message: "Keep going", createdAt: created.toISOString(), read: false }],
      unread: 3,
    }));
  });

  it("answers 401 signed out", async () => {
    auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });
});

describe("PATCH /api/nudges", () => {
  it("marks one when the body names it", async () => {
    const response = await patch({ id: "n1" });
    expect(markNudgesRead).toHaveBeenCalledWith("r1", "n1");
    expect(await response.json()).toEqual({ unread: 3 });
  });

  it("marks all with no body, or an id that is not a string", async () => {
    await patch();
    expect(markNudgesRead).toHaveBeenLastCalledWith("r1", null);
    await patch({ id: 42 });
    expect(markNudgesRead).toHaveBeenLastCalledWith("r1", null);
  });

  it("marks all for an empty id, as the old falsy check did", async () => {
    await patch({ id: "" });
    expect(markNudgesRead).toHaveBeenLastCalledWith("r1", null);
  });

  it("answers 500 when the write fails", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    markNudgesRead.mockRejectedValue(new Error("down"));
    const response = await patch({ id: "n1" });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to update reminders" });
    errors.mockRestore();
  });
});
