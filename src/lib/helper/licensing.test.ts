import { describe, expect, it } from "vitest";
import type { ExamType } from "@/lib/types/common";
import {
  canMarkResult,
  practiceLocked,
  resultMarkSchema,
  resultTotals,
} from "./licensing";

const admin = { id: "a", role: "ADMIN" } as const;
const unitManager = { id: "m", role: "MANAGER" } as const;
const recruit = {
  role: "USER",
  managerId: "m",
  examTracks: ["VUL"] as ExamType[],
};

describe("canMarkResult", () => {
  it("lets an admin mark a chosen exam", () => {
    expect(canMarkResult(admin, recruit, "VUL").ok).toBe(true);
  });

  it("lets a unit manager mark their own recruit", () => {
    expect(canMarkResult(unitManager, recruit, "VUL").ok).toBe(true);
  });

  it("stops a unit manager marking someone else's recruit", () => {
    expect(
      canMarkResult(unitManager, { ...recruit, managerId: "x" }, "VUL"),
    ).toMatchObject({ ok: false, status: 403 });
  });

  it("refuses a staff account", () => {
    expect(
      canMarkResult(admin, { ...recruit, role: "MANAGER" }, "VUL"),
    ).toMatchObject({ ok: false, status: 403 });
  });

  it("refuses an account that is gone", () => {
    expect(canMarkResult(admin, undefined, "VUL")).toMatchObject({
      ok: false,
      status: 404,
    });
  });

  it("refuses an exam they did not choose", () => {
    expect(canMarkResult(admin, recruit, "IIAP_A")).toMatchObject({
      ok: false,
      status: 409,
    });
  });

  it("refuses a reviewee who has not chosen yet", () => {
    expect(
      canMarkResult(admin, { ...recruit, examTracks: null }, "VUL"),
    ).toMatchObject({ ok: false, status: 409 });
  });
});

describe("resultTotals", () => {
  it("counts chosen exams without a mark as unmarked", () => {
    expect(
      resultTotals([
        { examTracks: ["VUL", "IIAP_A"], results: { VUL: "PASSED" } },
        { examTracks: ["IIAP_B"], results: { IIAP_B: "FAILED" } },
        { examTracks: null, results: {} },
      ]),
    ).toEqual({ passed: 1, failed: 1, unmarked: 1 });
  });
});

describe("practiceLocked", () => {
  it("locks practice only on a pass", () => {
    expect(practiceLocked("PASSED")).toBe(true);
    expect(practiceLocked("FAILED")).toBe(false);
    expect(practiceLocked(undefined)).toBe(false);
  });
});

describe("resultMarkSchema", () => {
  it("accepts a cleared mark", () => {
    expect(
      resultMarkSchema.safeParse({ examType: "VUL", outcome: null }).success,
    ).toBe(true);
  });

  it("refuses an outcome it does not know", () => {
    expect(
      resultMarkSchema.safeParse({ examType: "VUL", outcome: "MAYBE" }).success,
    ).toBe(false);
  });
});
