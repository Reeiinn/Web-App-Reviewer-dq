import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getFocusTracks, setFocusTracks } = vi.hoisted(() => ({
  auth: vi.fn(),
  getFocusTracks: vi.fn(),
  setFocusTracks: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/focus-tracks", () => ({ getFocusTracks, setFocusTracks }));

import { GET, PUT } from "./route";

const put = (body: string) =>
  PUT(
    new Request("http://internal.local/api/user/focus-tracks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
});

describe("/api/user/focus-tracks", () => {
  it("answers 401 when signed out", async () => {
    auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await put(`{"tracks":["VUL"]}`)).status).toBe(401);
  });

  it.each(["MANAGER", "ADMIN"])("answers 403 to %s", async (role) => {
    auth.mockResolvedValue({ user: { id: "s1", role } });
    expect((await GET()).status).toBe(403);
    expect((await put(`{"tracks":["VUL"]}`)).status).toBe(403);
    expect(setFocusTracks).not.toHaveBeenCalled();
  });

  it("reads the caller's tracks", async () => {
    getFocusTracks.mockResolvedValue({ tracks: ["VUL"], chosen: true });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tracks: ["VUL"], chosen: true });
    expect(getFocusTracks).toHaveBeenCalledWith("u1");
  });

  it("saves a valid pick", async () => {
    setFocusTracks.mockResolvedValue({ tracks: ["VUL", "IIAP_A"], chosen: true });
    const response = await put(`{"tracks":["IIAP_A","VUL"]}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tracks: ["VUL", "IIAP_A"], chosen: true });
    expect(setFocusTracks).toHaveBeenCalledWith("u1", ["IIAP_A", "VUL"]);
  });

  it.each([
    ["not json", "Invalid request body"],
    [`{"tracks":[]}`, "Pick at least one track"],
    [`{"tracks":["VUL","VUL"]}`, "Each track can be picked once"],
    [`{"tracks":["IIAP"]}`, "Unknown track"],
    [`{"tracks":"VUL"}`, undefined],
  ])("answers 400 to %s and saves nothing", async (body, message) => {
    const response = await put(body);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(typeof json.error).toBe("string");
    if (message) expect(json.error).toBe(message);
    expect(setFocusTracks).not.toHaveBeenCalled();
  });

  // A recorded result has to keep pointing at an exam the reviewee still has.
  it("refuses to drop an exam that has a recorded result", async () => {
    setFocusTracks.mockResolvedValue({ dropped: "IIAP_A" });
    const response = await put(`{"tracks":["VUL"]}`);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "IIAP (Set A) has a recorded exam result and can't be removed.",
    });
  });

  it("answers 500 when saving fails", async () => {
    setFocusTracks.mockRejectedValue(new Error("db down"));
    expect((await put(`{"tracks":["VUL"]}`)).status).toBe(500);
  });
});
