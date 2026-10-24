import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, fetchRecent, getFocusTracks } = vi.hoisted(() => ({
  auth: vi.fn(),
  fetchRecent: vi.fn(),
  getFocusTracks: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/progress", () => ({ fetchRecent }));
vi.mock("@/server/data/focus-tracks", () => ({ getFocusTracks }));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  fetchRecent.mockResolvedValue([]);
});

describe("GET /api/recent-activity", () => {
  it("asks for Quick Access on focus tracks only", async () => {
    getFocusTracks.mockResolvedValue({ tracks: ["IIAP_B"], chosen: true });
    await GET();
    expect(fetchRecent).toHaveBeenCalledWith("u1", 3, ["IIAP_B"]);
  });
});
