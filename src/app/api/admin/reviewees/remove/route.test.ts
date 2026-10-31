import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, findActiveAccounts, removeReviewees, recordAdminAction, touchLastSeen } =
  vi.hoisted(() => ({
    auth: vi.fn(),
    findActiveAccounts: vi.fn(),
    removeReviewees: vi.fn(),
    recordAdminAction: vi.fn(),
    touchLastSeen: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/staff", () => ({
  findActiveAccounts, removeReviewees, recordAdminAction, touchLastSeen,
}));

import { POST } from "./route";

const id = (n: number) => `${n}${n}${n}${n}${n}${n}${n}${n}-1111-4111-8111-111111111111`;
const account = (n: number, over: Record<string, unknown> = {}) => ({
  id: id(n), name: `R${n}`, email: `r${n}@example.test`, role: "USER", managerId: "m1", ...over,
});

async function remove(body: unknown) {
  const response = await POST(
    new Request("http://internal.local/api/admin/reviewees/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "m1", role: "MANAGER", email: "m@example.test" } });
  findActiveAccounts.mockResolvedValue([account(1), account(2)]);
  removeReviewees.mockImplementation(async (ids: string[]) => ids);
});

describe("POST /api/admin/reviewees/remove", () => {
  it("answers 401 when signed out", async () => {
    auth.mockResolvedValue(null);
    expect((await remove({ ids: [id(1)] })).status).toBe(401);
  });

  it("refuses a reviewee", async () => {
    auth.mockResolvedValue({ user: { id: "r1", role: "USER" } });
    expect((await remove({ ids: [id(1)] })).status).toBe(403);
    expect(removeReviewees).not.toHaveBeenCalled();
  });

  it.each([
    ["not json", "not json"],
    ["an empty selection", { ids: [] }],
    ["more than one batch", { ids: Array.from({ length: 201 }, (_, n) => String(n)) }],
  ])("answers 400 to %s", async (_label, body) => {
    expect((await remove(body)).status).toBe(400);
    expect(removeReviewees).not.toHaveBeenCalled();
  });

  it("removes the whole selection and records each one", async () => {
    const { status, body } = await remove({ ids: [id(1), id(2)] });

    expect(status).toBe(200);
    expect(body).toEqual({
      removed: [{ id: id(1), name: "R1" }, { id: id(2), name: "R2" }],
      skipped: [],
    });
    expect(removeReviewees).toHaveBeenCalledWith([id(1), id(2)]);
    expect(recordAdminAction).toHaveBeenCalledTimes(2);
    expect(recordAdminAction).toHaveBeenCalledWith({
      actor: { id: "m1", email: "m@example.test", role: "MANAGER" },
      action: "reviewee.removed",
      target: { id: id(1), email: "r1@example.test", name: "R1" },
    });
  });

  // One account the caller may not touch is no reason to keep the rest, but
  // nothing is skipped without saying why.
  it("removes what it may and names every account it left, with why", async () => {
    findActiveAccounts.mockResolvedValue([
      account(1),
      account(2, { managerId: "m2" }),
      account(3, { role: "MANAGER", managerId: null }),
    ]);
    const { body } = await remove({ ids: [id(1), id(2), id(3), id(4), "m1", "junk"] });

    expect(body.removed).toEqual([{ id: id(1), name: "R1" }]);
    expect(body.skipped).toEqual([
      { id: id(2), name: "R2", reason: "You can only remove reviewees you manage." },
      { id: id(3), name: "R3", reason: "Only reviewee accounts can be removed here." },
      { id: id(4), reason: "That reviewee no longer exists." },
      { id: "m1", reason: "You cannot remove your own account." },
      { id: "junk", reason: "That reviewee no longer exists." },
    ]);
    expect(removeReviewees).toHaveBeenCalledWith([id(1)]);
    expect(recordAdminAction).toHaveBeenCalledTimes(1);
  });

  // Removed by someone else between the lookup and the stamp: still gone, so
  // it is reported rather than silently dropped, and not recorded twice.
  it("reports an account another request removed first", async () => {
    removeReviewees.mockResolvedValue([id(1)]);
    const { body } = await remove({ ids: [id(1), id(2)] });

    expect(body.removed).toEqual([{ id: id(1), name: "R1" }]);
    expect(body.skipped).toEqual([
      { id: id(2), name: "R2", reason: "That reviewee no longer exists." },
    ]);
    expect(recordAdminAction).toHaveBeenCalledTimes(1);
  });

  it("answers 500 when removing fails", async () => {
    removeReviewees.mockRejectedValue(new Error("db down"));
    expect((await remove({ ids: [id(1)] })).status).toBe(500);
  });
});
