import { describe, expect, it } from "vitest";
import { practiceEntry, readCompletion } from "./practice-gate";

describe("practiceEntry", () => {
  it("closes a new sitting once the real exam is passed", () => {
    expect(
      practiceEntry({ passed: true, reviewing: false, eligible: true }),
    ).toBe("licensed");
  });

  // The review is the one thing a pass leaves open, decks finished or not.
  it("opens the review to a passer whose decks are unfinished", () => {
    expect(
      practiceEntry({ passed: true, reviewing: true, eligible: false }),
    ).toBe("open");
  });

  it("keeps the study lock for everyone else", () => {
    expect(
      practiceEntry({ passed: false, reviewing: true, eligible: false }),
    ).toBe("locked");
  });

  it("opens a sitting once the decks are mastered", () => {
    expect(
      practiceEntry({ passed: false, reviewing: false, eligible: true }),
    ).toBe("open");
  });
});

describe("readCompletion", () => {
  it("reads a scored sitting", () => {
    expect(
      readCompletion(true, {
        passed: true,
        passes: 3,
        certificate: { id: "c1" },
      }),
    ).toEqual({
      kind: "scored",
      passed: true,
      passes: 3,
      certificateId: "c1",
    });
  });

  // A pass recorded mid-sitting must not read as a failed sitting.
  it("reads the passed lock as licensed, not as a fail", () => {
    expect(
      readCompletion(false, { error: "You've passed", licensed: true }),
    ).toEqual({ kind: "licensed" });
  });

  it("reads any other refusal as an error, not a score", () => {
    expect(readCompletion(false, { error: "Failed to complete attempt" })).toEqual(
      { kind: "error", message: "Failed to complete attempt" },
    );
  });

  it("falls back to a message when the refusal has none", () => {
    expect(readCompletion(false, null)).toMatchObject({ kind: "error" });
  });
});
