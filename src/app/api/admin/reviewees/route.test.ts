import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, listReviewees, getTrackCountsFor, touchLastSeen, getFocusTracksFor } = vi.hoisted(() => ({
  auth: vi.fn(),
  listReviewees: vi.fn(),
  getTrackCountsFor: vi.fn(),
  touchLastSeen: vi.fn(),
  getFocusTracksFor: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/mastery", () => ({ getTrackCountsFor }));
vi.mock("@/server/data/staff", () => ({ listReviewees, touchLastSeen }));
vi.mock("@/server/data/focus-tracks", () => ({ getFocusTracksFor }));

import { buildTrackCounts, type ProgressRow } from "@/lib/helper/track-counts";
import { examTypes, type ExamType } from "@/lib/types/common";
import { GET } from "./route";

const reviewee = { id: "r1", email: "r@example.test", name: "Rae", image: null, manager: null };

const progress = (exam_type: string, last_answer_at: Date | null): ProgressRow => ({
  user_id: "r1", exam_type, flashcards_mastered: 1, memorization_mastered: 1,
  memorization_answered: 2, memorization_correct: 1, questions_mastered: 0,
  attempts_taken: 1, passing_attempts: 1, last_reviewed_at: null, last_answer_at,
});

const totals = (exam_type: string) => ({
  exam_type, flashcards: 1, memorization: 1, questions: 1,
});

const roster = async (query = "") =>
  (await GET(new Request(`http://internal.local/api/admin/reviewees${query}`))).json();

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
  listReviewees.mockResolvedValue([reviewee]);
  getTrackCountsFor.mockResolvedValue(new Map([["r1", []]]));
  getFocusTracksFor.mockImplementation(async (ids: string[]) =>
    new Map(ids.map((id) => [id, { tracks: [...examTypes], chosen: false }])),
  );
});

describe("GET /api/admin/reviewees", () => {
  it("scores a VUL-only reviewee on VUL alone", async () => {
    getFocusTracksFor.mockResolvedValue(new Map([["r1", { tracks: ["VUL"], chosen: true }]]));
    const done: ProgressRow = {
      user_id: "r1", exam_type: "VUL", flashcards_mastered: 1, memorization_mastered: 1,
      memorization_answered: 1, memorization_correct: 1, questions_mastered: 1,
      attempts_taken: 5, passing_attempts: 5, last_reviewed_at: null, last_answer_at: null,
    };
    getTrackCountsFor.mockImplementation(async (ids: string[], tracks: ExamType[]) =>
      new Map([[ids[0], tracks.map((t) =>
        buildTrackCounts(t, totals(t), t === "VUL" ? done : undefined))]]),
    );

    const [row] = await roster();

    expect(row.readiness).toBe(100);
    expect(row.status).toBe("EXAM_READY");
    expect(row.byExam.map((e: { examType: string }) => e.examType)).toEqual(["VUL"]);
    expect(row.practiceExam).toMatchObject({ passedTracks: 1, taken: 5 });
    expect(row.practiceExam.tracks).toHaveLength(1);
    expect(row.flashcards).toEqual({ total: 1, mastered: 1 });
    expect(row.focusTracks).toEqual({ tracks: ["VUL"], chosen: true });
  });

  it("zooms every row to ?exam_type, in focus or not", async () => {
    getFocusTracksFor.mockResolvedValue(new Map([["r1", { tracks: ["VUL"], chosen: true }]]));
    getTrackCountsFor.mockImplementation(async (ids: string[], tracks: ExamType[]) =>
      new Map([[ids[0], tracks.map((t) => buildTrackCounts(t, totals(t), undefined))]]),
    );
    const [row] = await roster("?exam_type=IIAP_B");
    expect(row.byExam.map((e: { examType: string }) => e.examType)).toEqual(["IIAP_B"]);
    expect(row.focusTracks.tracks).toEqual(["VUL"]);
  });

  it("scores each track from the mastery module", async () => {
    getTrackCountsFor.mockImplementation(async (ids: string[], tracks: ExamType[]) =>
      new Map([[ids[0], tracks.map((t) => buildTrackCounts(t, totals(t), progress(t, null)))]]),
    );
    const [row] = await roster();

    expect(getTrackCountsFor).toHaveBeenCalledWith(["r1"], examTypes);
    // each track: 100 + 100 + 0 → 67
    expect(row.readiness).toBe(67);
    expect(row.byExam).toHaveLength(4);
    expect(row.memorize).toEqual({ total: 4, mastered: 4, accuracy: 50 });
    expect(row.practiceExam.tracks[0]).toEqual({
      examType: "VUL", taken: 1, passes: 1, required: 5, passed: false,
    });
  });

  it("reports the most recent activity, not the alphabetically last weekday", async () => {
    const wednesday = new Date("2026-10-14T09:00:00Z");
    const thursday = new Date("2026-10-15T09:00:00Z");
    getTrackCountsFor.mockResolvedValue(
      new Map([["r1", [
        buildTrackCounts("VUL", totals("VUL"), progress("VUL", thursday)),
        buildTrackCounts("TRADITIONAL_LIFE", totals("TRADITIONAL_LIFE"), progress("TRADITIONAL_LIFE", wednesday)),
      ]]]),
    );
    const [row] = await roster();
    expect(row.activity.lastActivity).toBe(thursday.toISOString());
  });

  it("narrows to one track with ?exam_type", async () => {
    await roster("?exam_type=IIAP_A");
    expect(getTrackCountsFor).toHaveBeenCalledWith(["r1"], ["IIAP_A"]);
  });

  it("lists every reviewee for an admin and only their own for a manager", async () => {
    await roster();
    expect(listReviewees).toHaveBeenLastCalledWith(null);

    auth.mockResolvedValue({ user: { id: "m1", role: "MANAGER" } });
    await roster();
    expect(listReviewees).toHaveBeenLastCalledWith("m1");
  });

  it("keeps the row's leading keys and the manager object in order", async () => {
    listReviewees.mockResolvedValue([{
      ...reviewee,
      manager: { id: "m1", name: "Mae", email: "m@example.test", role: "MANAGER", image: null },
    }]);
    const [row] = await roster();

    expect(Object.keys(row).slice(0, 5)).toEqual(["id", "name", "email", "image", "manager"]);
    expect(JSON.stringify(row.manager)).toBe(
      JSON.stringify({ id: "m1", name: "Mae", email: "m@example.test", role: "MANAGER", image: null }),
    );
  });

  it("answers an empty roster without reading counts", async () => {
    listReviewees.mockResolvedValue([]);
    expect(await roster()).toEqual([]);
    expect(getTrackCountsFor).not.toHaveBeenCalled();
  });

  it("refuses a reviewee", async () => {
    auth.mockResolvedValue({ user: { id: "r1", role: "USER" } });
    const response = await GET(new Request("http://internal.local/api/admin/reviewees"));
    expect(response.status).toBe(403);
    expect(listReviewees).not.toHaveBeenCalled();
  });
});
