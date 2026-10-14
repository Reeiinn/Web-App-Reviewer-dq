import { describe, expect, it } from "vitest";
import { isExamType } from "@/lib/types/common";
import {
  buildTrackCounts,
  eligibleTracks,
  latestActivity,
  tracksWithContent,
  type ContentTotalsRow,
  type ProgressRow,
} from "./track-counts";

const totals = (
  exam_type: string,
  flashcards: number,
  memorization: number,
  questions: number,
): ContentTotalsRow => ({ exam_type, flashcards, memorization, questions });

const progress: ProgressRow = {
  user_id: "u1",
  exam_type: "VUL",
  flashcards_mastered: 3,
  memorization_mastered: 2,
  memorization_answered: 4,
  memorization_correct: 3,
  questions_mastered: 1,
  attempts_taken: 6,
  passing_attempts: 5,
  last_reviewed_at: new Date("2026-10-01T00:00:00Z"),
  last_answer_at: new Date("2026-10-02T00:00:00Z"),
};

describe("buildTrackCounts", () => {
  it("pairs a track's totals with the user's progress", () => {
    expect(buildTrackCounts("VUL", totals("VUL", 10, 5, 20), progress)).toEqual({
      examType: "VUL",
      flashcards: { mastered: 3, total: 10 },
      memorization: { mastered: 2, total: 5 },
      practice: { mastered: 1, total: 20 },
      memorizationAnswered: 4,
      memorizationCorrect: 3,
      attemptsTaken: 6,
      passingAttempts: 5,
      lastReviewedAt: progress.last_reviewed_at,
      lastAnswerAt: progress.last_answer_at,
    });
  });

  it("scores an untouched track as nought against its real totals", () => {
    const counts = buildTrackCounts("IIAP_A", totals("IIAP_A", 8, 0, 4), undefined);
    expect(counts.flashcards).toEqual({ mastered: 0, total: 8 });
    expect(counts.practice).toEqual({ mastered: 0, total: 4 });
    expect(counts.passingAttempts).toBe(0);
    expect(counts.lastReviewedAt).toBeNull();
  });

  it("scores a track with no content as nought of nought", () => {
    expect(buildTrackCounts("IIAP_B", undefined, undefined).flashcards).toEqual({
      mastered: 0,
      total: 0,
    });
  });
});

describe("tracksWithContent", () => {
  it("lists known tracks that hold anything, in the standard order", () => {
    expect(
      tracksWithContent([
        totals("IIAP_B", 0, 0, 3),
        totals("VUL", 1, 0, 0),
        totals("IIAP", 9, 9, 9), // legacy enum value, not a track any more
      ]),
    ).toEqual(["VUL", "IIAP_B"]);
  });
});

describe("eligibleTracks", () => {
  it("drops a track whose only content is practice questions", () => {
    const onlyQuestions = buildTrackCounts("IIAP_B", totals("IIAP_B", 0, 0, 3), undefined);
    const withDecks = buildTrackCounts("VUL", totals("VUL", 1, 0, 0), undefined);
    expect(eligibleTracks([withDecks, onlyQuestions]).map((t) => t.examType)).toEqual(["VUL"]);
  });
});

describe("latestActivity", () => {
  it("picks the most recent instant, not the alphabetically last weekday", () => {
    // As text, "Wed ..." sorts after "Thu ..."; the Thursday is later.
    const wednesday = new Date("2026-10-14T09:00:00Z");
    const thursday = new Date("2026-10-15T09:00:00Z");
    expect(latestActivity([thursday, null, wednesday])).toBe(thursday.toISOString());
  });

  it("answers null when nothing has happened", () => {
    expect(latestActivity([null, null])).toBeNull();
  });
});

describe("isExamType", () => {
  it("accepts the four tracks and nothing else", () => {
    expect(isExamType("TRADITIONAL_LIFE")).toBe(true);
    expect(isExamType("IIAP")).toBe(false);
    expect(isExamType("vul")).toBe(false);
    expect(isExamType(undefined)).toBe(false);
  });
});
