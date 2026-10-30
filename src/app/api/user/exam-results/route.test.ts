import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, outcomesFor } = vi.hoisted(() => ({
  auth: vi.fn(),
  outcomesFor: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/exam-results", () => ({ outcomesFor }));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
});

describe("GET /api/user/exam-results", () => {
  it("answers 401 when signed out", async () => {
    auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it.each(["MANAGER", "ADMIN"])("answers 403 to %s", async (role) => {
    auth.mockResolvedValue({ user: { id: "s1", role } });
    expect((await GET()).status).toBe(403);
    expect(outcomesFor).not.toHaveBeenCalled();
  });

  it("reads the caller's own results", async () => {
    outcomesFor.mockResolvedValue({ VUL: "PASSED" });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ results: { VUL: "PASSED" } });
    expect(outcomesFor).toHaveBeenCalledWith("u1");
  });

  it("answers 500 when reading fails", async () => {
    outcomesFor.mockRejectedValue(new Error("db down"));
    expect((await GET()).status).toBe(500);
  });
});
