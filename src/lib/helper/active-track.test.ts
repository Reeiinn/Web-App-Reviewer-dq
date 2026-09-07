import { describe, expect, it } from "vitest";
import { examTypes } from "../types/common";
import { pickActiveTrack } from "./active-track";

describe("pickActiveTrack", () => {
  it("returns null when no track has been studied", () => {
    expect(pickActiveTrack(examTypes, {})).toBeNull();
  });

  it("picks the most recently studied track", () => {
    const active = pickActiveTrack(examTypes, {
      VUL: "2026-09-01T10:00:00.000Z",
      TRADITIONAL_LIFE: "2026-09-05T10:00:00.000Z",
    });
    expect(active).toBe("TRADITIONAL_LIFE");
  });

  it("does not favour the first track when another was studied later", () => {
    const active = pickActiveTrack(examTypes, {
      VUL: "2026-09-01T10:00:00.000Z",
      IIAP_B: "2026-09-02T10:00:00.000Z",
    });
    expect(active).toBe("IIAP_B");
  });

  it("ignores tracks with no recorded activity", () => {
    const active = pickActiveTrack(examTypes, {
      VUL: null,
      IIAP_A: "2026-09-03T10:00:00.000Z",
      IIAP_B: null,
    });
    expect(active).toBe("IIAP_A");
  });

  it("ignores unparseable timestamps", () => {
    const active = pickActiveTrack(examTypes, {
      VUL: "not a date",
      TRADITIONAL_LIFE: "2026-09-04T10:00:00.000Z",
    });
    expect(active).toBe("TRADITIONAL_LIFE");
  });

  it("keeps the earlier track in the list when timestamps tie", () => {
    const active = pickActiveTrack(examTypes, {
      VUL: "2026-09-06T10:00:00.000Z",
      TRADITIONAL_LIFE: "2026-09-06T10:00:00.000Z",
    });
    expect(active).toBe("VUL");
  });
});

