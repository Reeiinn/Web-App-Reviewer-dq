import { describe, expect, it } from "vitest";
import { ONBOARDING_TOURS } from "./onboarding-tour";

describe("ONBOARDING_TOURS", () => {
  it("gives every role its own tour", () => {
    expect(Object.keys(ONBOARDING_TOURS).sort()).toEqual([
      "ADMIN",
      "MANAGER",
      "USER",
    ]);
  });

  // The tour is a nudge, not a manual: it is shown once, to someone who has
  // not asked for it, and every extra stop is one more press between them and
  // the screen they signed in for.
  it("keeps every tour short enough to read in one sitting", () => {
    for (const steps of Object.values(ONBOARDING_TOURS)) {
      expect(steps!.length).toBeGreaterThanOrEqual(3);
      expect(steps!.length).toBeLessThanOrEqual(6);
    }
  });

  it("never points two stops of the same tour at one target", () => {
    for (const steps of Object.values(ONBOARDING_TOURS)) {
      const targets = steps!.map((step) => step.target);
      expect(new Set(targets).size).toBe(targets.length);
    }
  });

  // Whatever else a role's tour covers, it ends on the account menu, which is
  // the only place a photo can be uploaded and the only way back to the tour.
  it("finishes every tour on the account menu", () => {
    for (const steps of Object.values(ONBOARDING_TOURS)) {
      expect(steps!.at(-1)!.target).toBe("tour-profile");
    }
  });

  it("points every role at the glossary", () => {
    for (const steps of Object.values(ONBOARDING_TOURS)) {
      expect(steps!.map((step) => step.target)).toContain("tour-glossary");
    }
  });
});
