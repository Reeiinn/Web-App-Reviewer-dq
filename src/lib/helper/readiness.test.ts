import { describe, expect, it } from "vitest";
import { masteryPercent, readinessStatus, trackReadiness } from "./readiness";

describe("masteryPercent", () => {
  it("reads a part of a set as a rounded percentage", () => {
    expect(masteryPercent({ mastered: 18, total: 64 })).toBe(28);
  });

  it("reads an untouched set as nought rather than dividing by zero", () => {
    expect(masteryPercent({ mastered: 0, total: 0 })).toBe(0);
  });

  it("reads a finished set as a hundred", () => {
    expect(masteryPercent({ mastered: 40, total: 40 })).toBe(100);
  });
});

describe("trackReadiness", () => {
  it("weighs the three study modes equally", () => {
    expect(
      trackReadiness({
        flashcards: { mastered: 50, total: 100 },
        memorization: { mastered: 100, total: 100 },
        practice: { mastered: 0, total: 100 },
      }),
    ).toBe(50);
  });

  // A track seeded with flashcards alone would otherwise read as fully ready
  // off one mode, which is the score the roster is meant not to show.
  it("counts a mode with no content as nought, not as absent", () => {
    expect(
      trackReadiness({
        flashcards: { mastered: 60, total: 60 },
        memorization: { mastered: 0, total: 0 },
        practice: { mastered: 0, total: 0 },
      }),
    ).toBe(33);
  });

  it("reads an untouched track as nought", () => {
    expect(
      trackReadiness({
        flashcards: { mastered: 0, total: 64 },
        memorization: { mastered: 0, total: 40 },
        practice: { mastered: 0, total: 80 },
      }),
    ).toBe(0);
  });
});

describe("readinessStatus", () => {
  it("calls a track at the thresholds by the higher band", () => {
    expect(readinessStatus(90)).toBe("EXAM_READY");
    expect(readinessStatus(60)).toBe("ON_TRACK");
  });

  it("calls anything under the on-track bar at risk", () => {
    expect(readinessStatus(59)).toBe("AT_RISK");
  });
});
