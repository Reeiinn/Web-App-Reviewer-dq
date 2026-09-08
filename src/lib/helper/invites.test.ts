import { describe, expect, it } from "vitest";
import {
  canInvite,
  claimantMatches,
  isInviteRole,
  managerForInvite,
} from "./invites";

describe("claimantMatches", () => {
  it("lets anyone claim an invite with no address on it", () => {
    expect(claimantMatches(null, "someone@example.com").ok).toBe(true);
  });

  it("matches the address it was sent to", () => {
    expect(claimantMatches("rene@example.com", "rene@example.com").ok).toBe(
      true,
    );
  });

  // The signup form and the invite box are typed by different people.
  it("ignores case and surrounding space", () => {
    expect(claimantMatches("  Rene@Example.com ", "rene@example.com").ok).toBe(
      true,
    );
  });

  it("refuses a forwarded link claimed by somebody else", () => {
    expect(claimantMatches("rene@example.com", "other@example.com").ok).toBe(
      false,
    );
  });
});

describe("canInvite", () => {
  it("lets the Sales Manager invite a Field Manager", () => {
    expect(canInvite("ADMIN", "MANAGER").ok).toBe(true);
  });

  // Staff are appointed from above, never sideways.
  it("refuses a Field Manager inviting a peer", () => {
    expect(canInvite("MANAGER", "MANAGER").ok).toBe(false);
  });

  it("lets a Field Manager invite a reviewee", () => {
    expect(canInvite("MANAGER", "USER").ok).toBe(true);
  });

  it("refuses a reviewee inviting anyone", () => {
    expect(canInvite("USER", "USER").ok).toBe(false);
  });

  it("refuses an account with no role at all", () => {
    expect(canInvite(undefined, "USER").ok).toBe(false);
  });
});

describe("isInviteRole", () => {
  it("accepts the two roles an invite can grant", () => {
    expect(isInviteRole("USER")).toBe(true);
    expect(isInviteRole("MANAGER")).toBe(true);
  });

  // ADMIN is not something an invite hands out.
  it("rejects anything else", () => {
    expect(isInviteRole("ADMIN")).toBe(false);
    expect(isInviteRole(null)).toBe(false);
  });
});

describe("managerForInvite", () => {
  it("puts a reviewee under whoever invited them", () => {
    expect(managerForInvite("USER", "admin-1")).toBe("admin-1");
  });

  it("leaves a Field Manager standing alone", () => {
    expect(managerForInvite("MANAGER", "admin-1")).toBeNull();
  });
});
