import { describe, expect, it } from "vitest";
import {
  inFocus,
  initialPicks,
  markedTrackDropped,
  markedTrackMessage,
  needsExamChoice,
  tracksFor,
} from "./exam-choice";

describe("markedTrackDropped", () => {
  it("names a marked exam missing from the new pick", () => {
    expect(markedTrackDropped(["VUL"], { IIAP_A: "FAILED" })).toBe("IIAP_A");
  });

  it("is null when every marked exam stays", () => {
    expect(
      markedTrackDropped(["VUL", "IIAP_A"], { IIAP_A: "PASSED" }),
    ).toBeNull();
  });

  it("names the exam in the refusal", () => {
    expect(markedTrackMessage("IIAP_A")).toBe(
      "IIAP (Set A) has a recorded exam result and can't be removed.",
    );
  });
});

describe("tracksFor", () => {
  it("falls back to all four before a pick", () => {
    expect(tracksFor(null)).toEqual([
      "VUL",
      "TRADITIONAL_LIFE",
      "IIAP_A",
      "IIAP_B",
    ]);
  });

  it("keeps the standard order", () => {
    expect(tracksFor(["IIAP_B", "VUL"])).toEqual(["VUL", "IIAP_B"]);
  });
});

describe("inFocus", () => {
  it("leaves out an exam that was not picked", () => {
    expect(inFocus(["VUL"], "IIAP_A")).toBe(false);
  });

  it("counts every exam before a pick", () => {
    expect(inFocus(null, "IIAP_A")).toBe(true);
  });
});

describe("needsExamChoice", () => {
  it("asks a reviewee who has not picked", () => {
    expect(needsExamChoice("USER", null)).toBe(true);
  });

  it("never asks staff", () => {
    expect(needsExamChoice("MANAGER", null)).toBe(false);
  });

  it("does not ask once picked", () => {
    expect(needsExamChoice("USER", ["VUL"])).toBe(false);
  });

  // A token minted before the claim existed carries nothing; asking then is
  // what sends every existing account to the picker once.
  it("asks when the token predates the claim", () => {
    expect(needsExamChoice("USER", undefined)).toBe(true);
  });
});

describe("initialPicks", () => {
  // A mark can land on an exam the reviewee dropped in the same moment. The
  // picker has to show it ticked, or every save is refused and they are stuck.
  it("ticks a marked exam even when it is missing from the pick", () => {
    expect([...initialPicks(["VUL"], { IIAP_A: "FAILED" })].sort()).toEqual([
      "IIAP_A",
      "VUL",
    ]);
  });

  it("starts empty before a pick with nothing marked", () => {
    expect(initialPicks(null, {}).size).toBe(0);
  });
});
