import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, fetchStreaks, getFocusTracks } = vi.hoisted(() => ({
  auth: vi.fn(),
  fetchStreaks: vi.fn(),
  getFocusTracks: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/progress", () => ({ fetchStreaks }));
vi.mock("@/server/data/focus-tracks", () => ({ getFocusTracks }));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  fetchStreaks.mockResolvedValue([]);
});

describe("GET /api/streaks", () => {
  it("asks only for focus tracks", async () => {
    getFocusTracks.mockResolvedValue({ tracks: ["VUL"], chosen: true });
    await GET();
    expect(fetchStreaks).toHaveBeenCalledWith("u1", ["VUL"]);
  });

  it("asks for all four with no selection", async () => {
    getFocusTracks.mockResolvedValue({
      tracks: ["VUL", "TRADITIONAL_LIFE", "IIAP_A", "IIAP_B"],
      chosen: false,
    });
    await GET();
    expect(fetchStreaks).toHaveBeenCalledWith("u1", ["VUL", "TRADITIONAL_LIFE", "IIAP_A", "IIAP_B"]);
  });
});
