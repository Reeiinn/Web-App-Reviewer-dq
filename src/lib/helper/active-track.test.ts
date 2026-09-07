import { describe, expect, it } from "vitest";
import { examTypes } from "../types/common";
import { pickActiveTrack, recentTracks } from "./active-track";

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

describe("recentTracks", () => {
  it("returns nothing when no track has been studied", () => {
    expect(recentTracks(examTypes, {})).toEqual([]);
  });

  it("orders tracks from most to least recent", () => {
    const recent = recentTracks(examTypes, {
      VUL: "2026-09-01T10:00:00.000Z",
      TRADITIONAL_LIFE: "2026-09-05T10:00:00.000Z",
      IIAP_A: "2026-09-03T10:00:00.000Z",
    });
    expect(recent).toEqual(["TRADITIONAL_LIFE", "IIAP_A", "VUL"]);
  });

  it("keeps at most three tracks", () => {
    const recent = recentTracks(examTypes, {
      VUL: "2026-09-01T10:00:00.000Z",
      TRADITIONAL_LIFE: "2026-09-02T10:00:00.000Z",
      IIAP_A: "2026-09-03T10:00:00.000Z",
      IIAP_B: "2026-09-04T10:00:00.000Z",
    });
    expect(recent).toEqual(["IIAP_B", "IIAP_A", "TRADITIONAL_LIFE"]);
  });

  it("drops tracks with no usable timestamp", () => {
    const recent = recentTracks(examTypes, {
      VUL: null,
      TRADITIONAL_LIFE: "not a date",
      IIAP_A: "2026-09-03T10:00:00.000Z",
    });
    expect(recent).toEqual(["IIAP_A"]);
  });

  it("starts with the same track pickActiveTrack marks as active", () => {
    const activity = {
      VUL: "2026-09-06T10:00:00.000Z",
      IIAP_B: "2026-09-07T10:00:00.000Z",
    };
    expect(recentTracks(examTypes, activity)[0]).toBe(
      pickActiveTrack(examTypes, activity),
    );
  });
});
