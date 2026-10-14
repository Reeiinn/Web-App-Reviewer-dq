import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getTrackCounts, getTrackCount } = vi.hoisted(() => ({
  auth: vi.fn(),
  getTrackCounts: vi.fn(),
  getTrackCount: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/mastery", () => ({ getTrackCounts, getTrackCount }));

import { buildTrackCounts } from "@/lib/helper/track-counts";
import { GET } from "./route";

const get = (query = "") =>
  GET(new Request(`http://internal.local/api/attempts/eligibility${query}`));

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
});

describe("GET /api/attempts/eligibility", () => {
  it("refuses a caller who is not signed in", async () => {
    auth.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
  });

  it("answers 400, not 500, for a track that does not exist", async () => {
    const response = await get("?exam_type=FOO");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "exam_type is invalid" });
    expect(getTrackCount).not.toHaveBeenCalled();
  });

  it("keys every track with decks by exam_type, skipping question-only tracks", async () => {
    getTrackCounts.mockResolvedValue([
      buildTrackCounts("VUL", { exam_type: "VUL", flashcards: 1, memorization: 1, questions: 0 }, undefined),
      buildTrackCounts("IIAP_B", { exam_type: "IIAP_B", flashcards: 0, memorization: 0, questions: 4 }, undefined),
    ]);
    const body = await (await get()).json();
    expect(Object.keys(body)).toEqual(["VUL"]);
    expect(body.VUL).toEqual({
      eligible: false,
      flashcards: { mastered: 0, total: 1 },
      memorization: { mastered: 0, total: 1 },
    });
  });

  it("answers for one named track", async () => {
    getTrackCount.mockResolvedValue(
      buildTrackCounts("VUL", { exam_type: "VUL", flashcards: 0, memorization: 0, questions: 0 }, undefined),
    );
    const body = await (await get("?exam_type=VUL")).json();
    expect(getTrackCount).toHaveBeenCalledWith("u1", "VUL");
    expect(body.eligible).toBe(false);
  });
});
