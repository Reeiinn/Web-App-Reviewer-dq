import { describe, expect, it } from "vitest";
import {
  NUDGE_COOLDOWN_MS,
  NUDGE_MAX_LENGTH,
  nudgeAllowedAfter,
  nudgeCooldownMessage,
  canDeleteNudge,
  canNudge,
  nudgeAge,
  nudgePresets,
  resolveNudge,
} from "./nudges";

const preset = nudgePresets[0];

describe("resolveNudge", () => {
  it("sends the phrase a known preset stands for", () => {
    expect(resolveNudge({ preset: preset.id })).toEqual({
      ok: true,
      message: preset.message,
    });
  });

  // A typo must not fall through to whatever text came with it.
  it("refuses a preset id it does not know", () => {
    const result = resolveNudge({ preset: "made-up", message: "Hello" });
    expect(result.ok).toBe(false);
  });

  it("takes the preset over a message sent alongside it", () => {
    expect(
      resolveNudge({ preset: preset.id, message: "Something else" }),
    ).toEqual({ ok: true, message: preset.message });
  });

  it("trims a custom message", () => {
    expect(resolveNudge({ message: "  Check in today  " })).toEqual({
      ok: true,
      message: "Check in today",
    });
  });

  it("refuses a message that is only whitespace", () => {
    expect(resolveNudge({ message: "   " }).ok).toBe(false);
  });

  it("refuses a message past the cap", () => {
    expect(resolveNudge({ message: "x".repeat(NUDGE_MAX_LENGTH + 1) }).ok).toBe(
      false,
    );
  });

  it("accepts a message exactly at the cap", () => {
    expect(resolveNudge({ message: "x".repeat(NUDGE_MAX_LENGTH) }).ok).toBe(
      true,
    );
  });

  it("refuses a request carrying neither", () => {
    expect(resolveNudge({}).ok).toBe(false);
  });
});

describe("canNudge", () => {
  const admin = { role: "ADMIN", id: "admin-1" };
  const manager = { role: "MANAGER", id: "manager-1" };

  it("lets an admin reach any reviewee", () => {
    expect(canNudge(admin, { role: "USER", manager_id: "manager-1" }).ok).toBe(
      true,
    );
  });

  it("lets a manager reach their own report", () => {
    expect(
      canNudge(manager, { role: "USER", manager_id: "manager-1" }).ok,
    ).toBe(true);
  });

  it("refuses a manager somebody else's report", () => {
    expect(
      canNudge(manager, { role: "USER", manager_id: "manager-2" }).ok,
    ).toBe(false);
  });

  // Staff carry no bell, so a nudge aimed at one would never be read.
  it("refuses a nudge aimed at staff", () => {
    expect(canNudge(admin, { role: "MANAGER", manager_id: null }).ok).toBe(
      false,
    );
  });

  it("refuses a sender who is not staff", () => {
    expect(
      canNudge(
        { role: "USER", id: "user-1" },
        { role: "USER", manager_id: null },
      ).ok,
    ).toBe(false);
  });
});

describe("nudgeAge", () => {
  const NOW = new Date("2026-09-08T12:00:00.000Z").getTime();
  const ago = (ms: number) => new Date(NOW - ms).toISOString();

  it("reads a reminder from seconds ago as new", () => {
    expect(nudgeAge(ago(5_000), NOW)).toBe("Just now");
  });

  it("counts minutes inside the hour", () => {
    expect(nudgeAge(ago(42 * 60_000), NOW)).toBe("42m ago");
  });

  it("counts hours inside the day", () => {
    expect(nudgeAge(ago(19 * 60 * 60_000), NOW)).toBe("19h ago");
  });

  it("counts days past that", () => {
    expect(nudgeAge(ago(3 * 24 * 60 * 60_000), NOW)).toBe("3d ago");
  });
});

describe("canDeleteNudge", () => {
  const admin = { role: "ADMIN", id: "admin-1" };
  const manager = { role: "MANAGER", id: "manager-1" };

  it("lets a manager take back their own reminder", () => {
    expect(canDeleteNudge(manager, { sender_id: "manager-1" }).ok).toBe(true);
  });

  // Two managers can share a reviewee; one does not edit the other's message.
  it("refuses a manager somebody else's reminder", () => {
    expect(canDeleteNudge(manager, { sender_id: "manager-2" }).ok).toBe(false);
  });

  it("lets an admin clear any reminder", () => {
    expect(canDeleteNudge(admin, { sender_id: "manager-2" }).ok).toBe(true);
  });

  it("refuses an account that is not staff", () => {
    expect(
      canDeleteNudge({ role: "USER", id: "user-1" }, { sender_id: "user-1" })
        .ok,
    ).toBe(false);
  });
});

describe("the wait between reminders", () => {
  it("lets a first reminder through", () => {
    expect(nudgeAllowedAfter(null)).toBe(true);
  });

  it("holds a second one until the cooldown has passed", () => {
    expect(nudgeAllowedAfter(NUDGE_COOLDOWN_MS - 1)).toBe(false);
    expect(nudgeAllowedAfter(NUDGE_COOLDOWN_MS)).toBe(true);
  });

  it("says how long is left in hours, then in minutes", () => {
    expect(nudgeCooldownMessage("Ada", 0)).toContain("4 hours");
    expect(
      nudgeCooldownMessage("Ada", NUDGE_COOLDOWN_MS - 30 * 60_000),
    ).toContain("30 minutes");
    // Never "0 minutes": a wait that is nearly over is still a wait.
    expect(nudgeCooldownMessage("Ada", NUDGE_COOLDOWN_MS - 1)).toContain(
      "1 minute",
    );
  });
});
