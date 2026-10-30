import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "@/server/db/prisma";
import { createUser, deleteUsers } from "@/test/db-fixtures";
import {
  clearResult,
  licensedOnAttempt,
  markResult,
  outcomeFor,
  outcomesFor,
  resultsFor,
} from "./exam-results";

let reviewee: string;
let other: string;
let marker: string;

beforeAll(async () => {
  reviewee = (await createUser()).id;
  other = (await createUser()).id;
  marker = (await createUser({ role: "ADMIN" })).id;
});

afterAll(async () => {
  await deleteUsers(reviewee, other, marker);
});

describe("exam results", () => {
  it("reads an unmarked exam as no outcome", async () => {
    expect(await outcomeFor(reviewee, "VUL")).toBeUndefined();
    expect(await outcomesFor(reviewee)).toEqual({});
  });

  it("records a mark and hands back what it replaced", async () => {
    expect(
      await markResult({ userId: reviewee, examType: "VUL", outcome: "FAILED", markedBy: marker }),
    ).toBeNull();
    expect(
      await markResult({ userId: reviewee, examType: "VUL", outcome: "PASSED", markedBy: marker }),
    ).toBe("FAILED");
    expect(await outcomeFor(reviewee, "VUL")).toBe("PASSED");
    expect(await prisma.examResult.count({ where: { userId: reviewee } })).toBe(1);
  });

  it("reads every reviewee's marks with who made them", async () => {
    await markResult({ userId: other, examType: "IIAP_A", outcome: "FAILED", markedBy: marker });
    const marks = await resultsFor([reviewee, other]);

    expect(marks.get(reviewee)?.VUL).toMatchObject({
      outcome: "PASSED",
      markedByRole: "ADMIN",
    });
    expect(marks.get(reviewee)?.VUL?.markedBy).toEqual(expect.any(String));
    expect(marks.get(other)?.IIAP_A?.outcome).toBe("FAILED");
    expect((await resultsFor([])).size).toBe(0);
  });

  it("clears a mark and hands back what it was", async () => {
    expect(await clearResult(other, "IIAP_A")).toBe("FAILED");
    expect(await clearResult(other, "IIAP_A")).toBeNull();
    expect(await outcomesFor(other)).toEqual({});
  });

  it("tells whether a sitting's exam has been passed for real", async () => {
    const passedTrack = await prisma.examAttempt.create({
      data: { userId: reviewee, examType: "VUL", score: 0, totalItems: 0, passed: false },
    });
    const openTrack = await prisma.examAttempt.create({
      data: { userId: reviewee, examType: "IIAP_B", score: 0, totalItems: 0, passed: false },
    });

    expect(await licensedOnAttempt(passedTrack.id)).toBe(true);
    expect(await licensedOnAttempt(openTrack.id)).toBe(false);
    expect(await licensedOnAttempt("00000000-0000-4000-8000-000000000000")).toBe(false);
  });

  it("keeps a result when the staff account that marked it goes", async () => {
    const leaver = (await createUser({ role: "MANAGER" })).id;
    await markResult({ userId: other, examType: "VUL", outcome: "PASSED", markedBy: leaver });
    await deleteUsers(leaver);

    const mark = (await resultsFor([other])).get(other)?.VUL;
    expect(mark).toMatchObject({ outcome: "PASSED", markedBy: null, markedByRole: null });
  });
});
