import { describe, expect, it } from "vitest";
import { trackLayout } from "./track-layout";

describe("trackLayout", () => {
  it("makes a single track wide", () => {
    expect(trackLayout(["IIAP_A"], null)).toEqual({
      order: ["IIAP_A"],
      wide: "IIAP_A",
    });
  });

  it("sits two tracks side by side", () => {
    expect(trackLayout(["VUL", "IIAP_A"], "IIAP_A")).toEqual({
      order: ["VUL", "IIAP_A"],
      wide: null,
    });
  });

  // Three in a two-column grid leaves a hole; the track being studied fills
  // the top row instead.
  it("puts the active one of three wide on top", () => {
    expect(trackLayout(["VUL", "TRADITIONAL_LIFE", "IIAP_B"], "IIAP_B")).toEqual(
      { order: ["IIAP_B", "VUL", "TRADITIONAL_LIFE"], wide: "IIAP_B" },
    );
  });

  it("widens the first of three when nothing is active yet", () => {
    expect(trackLayout(["VUL", "TRADITIONAL_LIFE", "IIAP_B"], null).wide).toBe(
      "VUL",
    );
  });

  it("ignores an active track that was not chosen", () => {
    expect(
      trackLayout(["VUL", "TRADITIONAL_LIFE", "IIAP_B"], "IIAP_A").wide,
    ).toBe("VUL");
  });

  it("keeps the grid for four tracks", () => {
    expect(
      trackLayout(["VUL", "TRADITIONAL_LIFE", "IIAP_A", "IIAP_B"], "VUL").wide,
    ).toBeNull();
  });
});
