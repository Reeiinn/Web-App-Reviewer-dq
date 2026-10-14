import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "@/server/db/prisma";
import { createUser, deleteUsers } from "@/test/db-fixtures";
import {
  getContentTotals,
  getTrackCount,
  getTrackCounts,
  getTrackCountsFor,
} from "./mastery";

let learner: string;
let untouched: string;
const contentIds: { f: string[]; m: string[]; q: string[] } = { f: [], m: [], q: [] };

beforeAll(async () => {
  learner = (await createUser()).id;
  untouched = (await createUser()).id;

  for (let i = 0; i < 2; i++) {
    const f = await prisma.flashcard.create({
      data: { examType: "VUL", category: "t", front: `f${i}`, back: "b" },
    });
    contentIds.f.push(f.id);
  }
  const m = await prisma.memorization.create({
    data: { examType: "VUL", category: "t", text: "m" },
  });
  contentIds.m.push(m.id);
  const q = await prisma.question.create({
    data: { examType: "TRADITIONAL_LIFE", category: "t", text: "q" },
  });
  contentIds.q.push(q.id);

  await prisma.flashcardProgress.create({
    data: { userId: learner, flashcardId: contentIds.f[0], mastered: true },
  });
  await prisma.flashcardProgress.create({
    data: { userId: learner, flashcardId: contentIds.f[1], mastered: false },
  });
  await prisma.memorizationProgress.create({
    data: { userId: learner, memorizationId: m.id, mastered: true, isCorrect: true },
  });
  await prisma.examAttempt.create({
    data: {
      userId: learner, examType: "VUL", score: 9, totalItems: 10,
      passed: true, completedAt: new Date(),
    },
  });
  // An unfinished sitting counts for nothing.
  await prisma.examAttempt.create({
    data: { userId: learner, examType: "VUL", score: 0, totalItems: 10, passed: false },
  });
  await prisma.studyStreak.create({
    data: { userId: learner, examType: "VUL", lastAnswerAt: new Date("2026-10-14T09:00:00Z") },
  });
});

afterAll(async () => {
  await deleteUsers(learner, untouched);
  await prisma.flashcard.deleteMany({ where: { id: { in: contentIds.f } } });
  await prisma.memorization.deleteMany({ where: { id: { in: contentIds.m } } });
  await prisma.question.deleteMany({ where: { id: { in: contentIds.q } } });
});

describe("mastery data", () => {
  it("counts each track's content", async () => {
    const totals = await getContentTotals();
    expect(totals.find((t) => t.exam_type === "VUL")).toMatchObject({
      flashcards: 2, memorization: 1, questions: 0,
    });
    expect(totals.find((t) => t.exam_type === "TRADITIONAL_LIFE")).toMatchObject({ questions: 1 });
  });

  it("reports a learner's standing on every track with content", async () => {
    const tracks = await getTrackCounts(learner);
    expect(tracks.map((t) => t.examType)).toEqual(["VUL", "TRADITIONAL_LIFE"]);
    const vul = tracks[0];
    expect(vul.flashcards).toEqual({ mastered: 1, total: 2 });
    expect(vul.memorization).toEqual({ mastered: 1, total: 1 });
    expect(vul.memorizationCorrect).toBe(1);
    expect(vul.attemptsTaken).toBe(1);
    expect(vul.passingAttempts).toBe(1);
    expect(vul.lastAnswerAt?.toISOString()).toBe("2026-10-14T09:00:00.000Z");
    expect(vul.lastReviewedAt).toBeInstanceOf(Date);
  });

  it("scores an untouched user as nought against real totals", async () => {
    const vul = await getTrackCount(untouched, "VUL");
    expect(vul.flashcards).toEqual({ mastered: 0, total: 2 });
    expect(vul.passingAttempts).toBe(0);
  });

  it("answers for every requested user and track, in one call", async () => {
    const byUser = await getTrackCountsFor([learner, untouched], ["VUL", "IIAP_A"]);
    expect([...byUser.keys()].sort()).toEqual([learner, untouched].sort());
    expect(byUser.get(untouched)!.map((t) => t.examType)).toEqual(["VUL", "IIAP_A"]);
    expect(byUser.get(learner)![0].flashcards.mastered).toBe(1);
    expect(byUser.get(learner)![1].flashcards).toEqual({ mastered: 0, total: 0 });
  });

  it("answers an empty map for no users", async () => {
    expect((await getTrackCountsFor([], ["VUL"])).size).toBe(0);
  });
});
