import { describe, expect, it } from "vitest";
import {
  RECRUIT_TARGET,
  lastSeenLabel,
  rankFieldManagers,
  recruitProgress,
} from "./field-manager";

const NOW = new Date("2026-09-08T12:00:00.000Z").getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("recruitProgress", () => {
  it("reads a manager who has recruited nobody as empty", () => {
    expect(recruitProgress(0)).toBe(0);
  });

  it("scores half the target at half full", () => {
    expect(recruitProgress(RECRUIT_TARGET / 2)).toBe(50);
  });

  it("fills the ring once the target is met", () => {
    expect(recruitProgress(RECRUIT_TARGET)).toBe(100);
  });

  // The ring is a share of the target, not a share of the best peer, so
  // passing the target cannot push it past full.
  it("holds at full for a manager past the target", () => {
    expect(recruitProgress(RECRUIT_TARGET * 3)).toBe(100);
  });

  it("rounds to a whole percent", () => {
    expect(recruitProgress(3)).toBe(30);
  });
});

describe("lastSeenLabel", () => {
  it("says never for an account that has not opened the app", () => {
    expect(lastSeenLabel(null, NOW)).toBe("Never");
  });

  it("counts minutes within the hour", () => {
    expect(lastSeenLabel(ago(40 * MINUTE), NOW)).toBe("40m ago");
  });

  it("counts hours within the day", () => {
    expect(lastSeenLabel(ago(2 * HOUR), NOW)).toBe("2h ago");
  });

  it("counts days beyond that", () => {
    expect(lastSeenLabel(ago(3 * DAY), NOW)).toBe("3d ago");
  });

  // A row written by a database clock a little ahead of this one is the
  // freshest visit there is, so it must not read as a negative age.
  it("reads a timestamp from the future as the most recent visit", () => {
    expect(lastSeenLabel(new Date(NOW + MINUTE).toISOString(), NOW)).toBe(
      "1m ago",
    );
  });

  it("says never for an unparseable timestamp", () => {
    expect(lastSeenLabel("not a date", NOW)).toBe("Never");
  });
});

describe("rankFieldManagers", () => {
  const manager = (
    name: string,
    recruits: number,
    lastSeenAt: string | null = null,
  ) => ({ name, recruits, lastSeenAt });

  it("puts the biggest recruiter first", () => {
    const ranked = rankFieldManagers([
      manager("Andrea", 8),
      manager("Maria", 14),
      manager("Nelson", 10),
    ]);

    expect(ranked.map((row) => row.name)).toEqual([
      "Maria",
      "Nelson",
      "Andrea",
    ]);
  });

  it("numbers the ranks from one, in order", () => {
    const ranked = rankFieldManagers([manager("Andrea", 8), manager("Maria", 14)]);

    expect(ranked.map((row) => row.rank)).toEqual([1, 2]);
  });

  // Recruiting is the ranking. Being logged in only settles a draw.
  it("breaks a tie on recruits with the more recent visit", () => {
    const ranked = rankFieldManagers([
      manager("Quiet", 5, ago(6 * DAY)),
      manager("Recent", 5, ago(2 * HOUR)),
    ]);

    expect(ranked.map((row) => row.name)).toEqual(["Recent", "Quiet"]);
  });

  it("sorts a manager who never opened the app below one who did", () => {
    const ranked = rankFieldManagers([
      manager("Never", 5, null),
      manager("Opened", 5, ago(30 * DAY)),
    ]);

    expect(ranked.map((row) => row.name)).toEqual(["Never", "Opened"].reverse());
  });

  it("falls back to name so the order never shuffles between loads", () => {
    const ranked = rankFieldManagers([
      manager("Zoe", 5, ago(HOUR)),
      manager("Adam", 5, ago(HOUR)),
    ]);

    expect(ranked.map((row) => row.name)).toEqual(["Adam", "Zoe"]);
  });

  it("ranks a manager with no recruits last rather than dropping them", () => {
    const ranked = rankFieldManagers([
      manager("Empty", 0, ago(MINUTE)),
      manager("Busy", 3, ago(30 * DAY)),
    ]);

    expect(ranked.map((row) => row.name)).toEqual(["Busy", "Empty"]);
    expect(ranked).toHaveLength(2);
  });

  it("leaves the caller's array untouched", () => {
    const managers = [manager("Andrea", 8), manager("Maria", 14)];
    rankFieldManagers(managers);

    expect(managers.map((row) => row.name)).toEqual(["Andrea", "Maria"]);
  });
});
