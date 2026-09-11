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

  // The tour is a nudge, not a manual — a fourth step is a sign it has grown
  // past what a first login should ask someone to read.
  it("keeps every tour to three stops", () => {
    for (const steps of Object.values(ONBOARDING_TOURS)) {
      expect(steps).toHaveLength(3);
    }
  });

  it("never points two stops of the same tour at one target", () => {
    for (const steps of Object.values(ONBOARDING_TOURS)) {
      const targets = steps!.map((step) => step.target);
      expect(new Set(targets).size).toBe(targets.length);
    }
  });
});
