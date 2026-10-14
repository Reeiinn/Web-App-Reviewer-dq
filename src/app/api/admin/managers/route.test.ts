import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, listManagers, touchLastSeen } = vi.hoisted(() => ({
  auth: vi.fn(),
  listManagers: vi.fn(),
  touchLastSeen: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/staff", () => ({ listManagers, touchLastSeen }));

import { presenceStatus } from "@/lib/helper/presence";
import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
});

describe("GET /api/admin/managers", () => {
  it("answers 401 signed out and 403 for a manager", async () => {
    auth.mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(401);

    auth.mockResolvedValueOnce({ user: { id: "m1", role: "MANAGER" } });
    expect((await GET()).status).toBe(403);
    expect(listManagers).not.toHaveBeenCalled();
  });

  it("returns each manager in today's shape, stamping the admin", async () => {
    const seen = new Date(Date.now() - 5 * 60_000);
    listManagers.mockResolvedValue([
      { id: "m1", name: "Mae", email: "m@example.test", image: null, lastSeenAt: seen, reviewees: 3 },
      { id: "m2", name: "Max", email: "x@example.test", image: "data:image/png;base64,AA==", lastSeenAt: null, reviewees: 0 },
    ]);

    const response = await GET();

    expect(touchLastSeen).toHaveBeenCalledWith("admin");
    expect(JSON.stringify(await response.json())).toBe(JSON.stringify([
      { id: "m1", name: "Mae", email: "m@example.test", image: null, lastSeenAt: seen.toISOString(), status: presenceStatus(seen.toISOString()), reviewees: 3 },
      { id: "m2", name: "Max", email: "x@example.test", image: "data:image/png;base64,AA==", lastSeenAt: null, status: presenceStatus(null), reviewees: 0 },
    ]));
  });

  it("answers 500 when the read fails", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    listManagers.mockRejectedValue(new Error("down"));
    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to fetch managers" });
    errors.mockRestore();
  });
});
