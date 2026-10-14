import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, query, getTrackCountsFor, touchLastSeen } = vi.hoisted(() => ({
  auth: vi.fn(),
  query: vi.fn(),
  getTrackCountsFor: vi.fn(),
  touchLastSeen: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/db", () => ({ default: { query } }));
vi.mock("@/server/data/mastery", () => ({ getTrackCountsFor }));
vi.mock("@/app/api/_lib/presence-store", () => ({ touchLastSeen }));

import { buildTrackCounts, type ProgressRow } from "@/lib/helper/track-counts";
import { examTypes, type ExamType } from "@/lib/types/common";
import { GET } from "./route";

const reviewee = {
  id: "r1", email: "r@example.test", name: "Rae", role: "USER", image: null,
  manager_id: null, manager_name: null, manager_email: null,
  manager_role: null, manager_image: null,
};

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
  query.mockResolvedValue({ rows: [reviewee] });
});

describe("GET /api/admin/reviewees", () => {
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
    getTrackCountsFor.mockResolvedValue(new Map([["r1", []]]));
    await roster("?exam_type=IIAP_A");
    expect(getTrackCountsFor).toHaveBeenCalledWith(["r1"], ["IIAP_A"]);
  });
});
