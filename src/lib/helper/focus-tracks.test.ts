import { describe, expect, it } from "vitest";
import { firstIssue, focusTracksBody, resolveFocusTracks } from "./focus-tracks";

describe("resolveFocusTracks", () => {
  it("reads no saved tracks as all four, not chosen", () => {
    expect(resolveFocusTracks([])).toEqual({
      tracks: ["VUL", "TRADITIONAL_LIFE", "IIAP_A", "IIAP_B"],
      chosen: false,
    });
  });

  it("returns a saved pick in the standard order", () => {
    expect(resolveFocusTracks(["IIAP_B", "VUL"])).toEqual({
      tracks: ["VUL", "IIAP_B"],
      chosen: true,
    });
  });

  it("ignores values that are not tracks", () => {
    expect(resolveFocusTracks(["IIAP"])).toEqual(resolveFocusTracks([]));
  });
});

describe("focusTracksBody", () => {
  const parse = (body: unknown) => focusTracksBody.safeParse(body);

  it("accepts one to four distinct tracks", () => {
    expect(parse({ tracks: ["VUL"] }).success).toBe(true);
    expect(parse({ tracks: ["VUL", "TRADITIONAL_LIFE", "IIAP_A", "IIAP_B"] }).success).toBe(true);
  });

  it.each([
    [{ tracks: [] }, "Pick at least one track"],
    [{ tracks: ["VUL", "VUL"] }, "Each track can be picked once"],
    [{ tracks: ["IIAP"] }, "Unknown track"],
    [{ tracks: "VUL" }, undefined],
    [{}, undefined],
    [null, undefined],
  ])("rejects %j", (body, message) => {
    const result = parse(body);
    expect(result.success).toBe(false);
    if (!result.success && message) expect(firstIssue(result.error)).toBe(message);
  });
});
