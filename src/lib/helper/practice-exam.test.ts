import { describe, expect, it } from "vitest";
import {
  PASSES_REQUIRED,
  PASSING_PERCENTAGE,
  cappedPasses,
  hasPassedTrack,
  passesLabel,
  sittingPassed,
} from "./practice-exam";

describe("sittingPassed", () => {
  it("passes a sitting on the threshold", () => {
    expect(sittingPassed(15, 20)).toBe(true); // 75%
  });

  it("fails a sitting just under it", () => {
    expect(sittingPassed(14, 20)).toBe(false); // 70%
  });

  it("treats an empty sitting as failed rather than dividing by zero", () => {
    expect(sittingPassed(0, 0)).toBe(false);
  });

  it("uses the documented threshold", () => {
    expect(PASSING_PERCENTAGE).toBe(75);
  });
});

describe("cappedPasses", () => {
  it("starts every track at nought", () => {
    expect(cappedPasses(0)).toBe(0);
    expect(passesLabel(0)).toBe(`0 / ${PASSES_REQUIRED}`);
  });

  it("counts up to the target", () => {
    expect(passesLabel(3)).toBe("3 / 5");
  });

  it("never reads above the target, however many extra sittings are passed", () => {
    expect(cappedPasses(9)).toBe(PASSES_REQUIRED);
    expect(passesLabel(9)).toBe("5 / 5");
  });

  it("ignores nonsense counts", () => {
    expect(cappedPasses(-4)).toBe(0);
  });
});

describe("hasPassedTrack", () => {
  it("stays unpassed until the last required pass lands", () => {
    expect(hasPassedTrack(PASSES_REQUIRED - 1)).toBe(false);
    expect(hasPassedTrack(PASSES_REQUIRED)).toBe(true);
  });

  it("stays passed once cleared", () => {
    expect(hasPassedTrack(PASSES_REQUIRED + 3)).toBe(true);
  });
});
