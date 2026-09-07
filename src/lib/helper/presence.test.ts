import { describe, expect, it } from "vitest";
import { presenceStatus } from "./presence";

const NOW = new Date("2026-09-08T12:00:00.000Z").getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("presenceStatus", () => {
  it("reads an account that has never opened the app as inactive", () => {
    expect(presenceStatus(null, NOW)).toBe("INACTIVE");
  });

  it("reads a visit minutes ago as active", () => {
    expect(presenceStatus(ago(5 * MINUTE), NOW)).toBe("ACTIVE");
  });

  it("keeps a visit earlier the same day active", () => {
    expect(presenceStatus(ago(23 * HOUR), NOW)).toBe("ACTIVE");
  });

  it("drops to idle once a full day has passed", () => {
    expect(presenceStatus(ago(DAY), NOW)).toBe("IDLE");
  });

  it("holds a visit from earlier in the week at idle", () => {
    expect(presenceStatus(ago(6 * DAY), NOW)).toBe("IDLE");
  });

  it("drops to inactive once a full week has passed", () => {
    expect(presenceStatus(ago(7 * DAY), NOW)).toBe("INACTIVE");
  });

  it("reads a long absence as inactive", () => {
    expect(presenceStatus(ago(90 * DAY), NOW)).toBe("INACTIVE");
  });

  // A server running slightly behind the row it just wrote should not report
  // the freshest possible visit as the stalest.
  it("treats a timestamp from the future as active", () => {
    expect(presenceStatus(new Date(NOW + MINUTE).toISOString(), NOW)).toBe(
      "ACTIVE",
    );
  });

  it("reads an unparseable timestamp as inactive", () => {
    expect(presenceStatus("not a date", NOW)).toBe("INACTIVE");
  });

  it("reads an empty timestamp as inactive", () => {
    expect(presenceStatus("", NOW)).toBe("INACTIVE");
  });
});
