import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, findActiveAccount, removeReviewee, recordAdminAction, touchLastSeen } =
  vi.hoisted(() => ({
    auth: vi.fn(),
    findActiveAccount: vi.fn(),
    removeReviewee: vi.fn(),
    recordAdminAction: vi.fn(),
    touchLastSeen: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/staff", () => ({
  findActiveAccount, removeReviewee, recordAdminAction, touchLastSeen,
}));

import { DELETE } from "./route";

const target = { id: "r1", name: "Rae", email: "r@example.test", role: "USER", managerId: "m1" };

async function remove(id = "r1") {
  const response = await DELETE(new Request(`http://internal.local/api/admin/reviewees/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  });
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "admin", role: "ADMIN", email: "a@example.test" } });
  findActiveAccount.mockResolvedValue(target);
  removeReviewee.mockResolvedValue(true);
});

describe("DELETE /api/admin/reviewees/[id]", () => {
  it("removes the reviewee, records it and answers in today's shape", async () => {
    const { status, body } = await remove();

    expect(status).toBe(200);
    expect(JSON.stringify(body)).toBe(JSON.stringify({ message: "Rae has been removed.", id: "r1" }));
    expect(removeReviewee).toHaveBeenCalledWith("r1");
    expect(recordAdminAction).toHaveBeenCalledWith({
      actor: { id: "admin", email: "a@example.test", role: "ADMIN" },
      action: "reviewee.removed",
      target: { id: "r1", email: "r@example.test", name: "Rae" },
    });
  });

  it("answers the same when another request removed them first, without a second record", async () => {
    removeReviewee.mockResolvedValue(false);
    const { status, body } = await remove();

    expect(status).toBe(200);
    expect(body).toEqual({ message: "Rae has been removed.", id: "r1" });
    expect(recordAdminAction).not.toHaveBeenCalled();
  });

  it("refuses the caller's own account", async () => {
    const { status, body } = await remove("admin");
    expect(status).toBe(400);
    expect(body).toEqual({ error: "You cannot remove your own account." });
  });

  it("answers 404 for an account that is gone", async () => {
    findActiveAccount.mockResolvedValue(null);
    const { status, body } = await remove();
    expect(status).toBe(404);
    expect(body).toEqual({ error: "That reviewee no longer exists." });
  });

  it("refuses staff accounts", async () => {
    findActiveAccount.mockResolvedValue({ ...target, role: "MANAGER" });
    const { status, body } = await remove();
    expect(status).toBe(403);
    expect(body).toEqual({ error: "Only reviewee accounts can be removed here." });
    expect(removeReviewee).not.toHaveBeenCalled();
  });

  it("lets a manager remove only their own reviewees", async () => {
    auth.mockResolvedValue({ user: { id: "m2", role: "MANAGER", email: "m2@example.test" } });
    const refused = await remove();
    expect(refused.status).toBe(403);
    expect(refused.body).toEqual({ error: "You can only remove reviewees you manage." });
    expect(removeReviewee).not.toHaveBeenCalled();

    auth.mockResolvedValue({ user: { id: "m1", role: "MANAGER", email: "m1@example.test" } });
    expect((await remove()).status).toBe(200);
  });

  it("answers 401 signed out and 403 for a reviewee", async () => {
    auth.mockResolvedValueOnce(null);
    expect((await remove()).status).toBe(401);
    auth.mockResolvedValueOnce({ user: { id: "r9", role: "USER" } });
    expect((await remove()).status).toBe(403);
  });

  it("answers 500 when the removal fails", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    removeReviewee.mockRejectedValue(new Error("down"));
    const { status, body } = await remove();
    expect(status).toBe(500);
    expect(body).toEqual({ error: "Failed to remove reviewee" });
    errors.mockRestore();
  });
});
