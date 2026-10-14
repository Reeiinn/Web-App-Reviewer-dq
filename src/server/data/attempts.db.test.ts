import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/server/db/prisma";
import {
  createQuestion,
  createUser,
  deleteContent,
  deleteUsers,
} from "@/test/db-fixtures";
import {
  findAttempt,
  findOpenAttempt,
  listAttemptAnswers,
  listCompletedSittings,
  openAttempt,
} from "./attempts";

// Users go first: their attempts' answers point at the questions with no
// delete rule, so the questions can only go once the attempts have.
const made: string[] = [];
const questions: string[] = [];
afterAll(async () => {
  await deleteUsers(...made);
  await deleteContent({ questions });
});

async function user() {
  const created = await createUser();
  made.push(created.id);
  return created;
}

async function question(examType: "VUL" | "IIAP_B" = "IIAP_B", text?: string) {
  const created = await createQuestion({
    examType,
    text,
    choices: [
      { text: "Right", isCorrect: true, sortOrder: 1 },
      { text: "Wrong", sortOrder: 2 },
    ],
  });
  questions.push(created.id);
  return created.id;
}

const trackQuestionIds = async (examType: "IIAP_B") =>
  (await prisma.question.findMany({ where: { examType }, select: { id: true } }))
    .map((q) => q.id)
    .sort();

describe("openAttempt", () => {
  it("deals every question on the track once and keeps the order with the attempt", async () => {
    const me = await user();
    await question();
    await question();
    await question();

    const { attempt, created } = await openAttempt(me.id, "IIAP_B");

    expect(created).toBe(true);
    expect(attempt).toMatchObject({
      userId: me.id,
      examType: "IIAP_B",
      score: 0,
      totalItems: 0,
      passed: false,
      completedAt: null,
    });
    expect(Array.isArray(attempt.questionOrder)).toBe(true);
    expect([...(attempt.questionOrder as string[])].sort()).toEqual(
      await trackQuestionIds("IIAP_B"),
    );
  });

  it("resumes the open sitting with the same paper instead of starting another", async () => {
    const me = await user();
    await question();

    const first = await openAttempt(me.id, "IIAP_B");
    const again = await openAttempt(me.id, "IIAP_B");

    expect(again.created).toBe(false);
    expect(again.attempt.id).toBe(first.attempt.id);
    expect(again.attempt.questionOrder).toEqual(first.attempt.questionOrder);
    expect(await prisma.examAttempt.count({ where: { userId: me.id } })).toBe(1);
  });

  it("deals a sitting from before stored order exists, once, and keeps it", async () => {
    const me = await user();
    await question();
    const old = await prisma.examAttempt.create({
      data: { userId: me.id, examType: "IIAP_B", score: 0, totalItems: 0, passed: false },
      select: { id: true },
    });

    const filled = await openAttempt(me.id, "IIAP_B");
    const again = await openAttempt(me.id, "IIAP_B");

    expect(filled.created).toBe(false);
    expect(filled.attempt.id).toBe(old.id);
    expect([...(filled.attempt.questionOrder as string[])].sort()).toEqual(
      await trackQuestionIds("IIAP_B"),
    );
    expect(again.attempt.questionOrder).toEqual(filled.attempt.questionOrder);
  });

  it("starts a new sitting once the last one is completed", async () => {
    const me = await user();
    await question();
    const first = await openAttempt(me.id, "IIAP_B");
    await prisma.examAttempt.update({
      where: { id: first.attempt.id },
      data: { completedAt: new Date() },
    });

    const next = await openAttempt(me.id, "IIAP_B");

    expect(next.created).toBe(true);
    expect(next.attempt.id).not.toBe(first.attempt.id);
  });

  it("keeps tracks apart", async () => {
    const me = await user();
    await question("VUL");
    const vul = await openAttempt(me.id, "VUL");

    expect(await findOpenAttempt(me.id, "IIAP_B")).toBeNull();
    expect((await findOpenAttempt(me.id, "VUL"))?.id).toBe(vul.attempt.id);
  });
});

describe("reading a sitting", () => {
  it("finds an attempt by id, and null for one that does not exist", async () => {
    const me = await user();
    await question();
    const { attempt } = await openAttempt(me.id, "IIAP_B");

    expect(await findAttempt(attempt.id)).toEqual(attempt);
    expect(await findAttempt("00000000-0000-4000-8000-000000000000")).toBeNull();
  });

  it("lists the attempt's answers with each question's text", async () => {
    const me = await user();
    const q = await question("IIAP_B", "Which is right?");
    const { attempt } = await openAttempt(me.id, "IIAP_B");
    const choice = await prisma.choice.findFirstOrThrow({
      where: { questionId: q, isCorrect: true },
      select: { id: true },
    });
    const saved = await prisma.examAttemptAnswer.create({
      data: { attemptId: attempt.id, questionId: q, selectedChoiceId: choice.id, isCorrect: true },
      select: { id: true },
    });

    expect(await listAttemptAnswers(attempt.id)).toEqual([
      {
        id: saved.id,
        questionId: q,
        selectedChoiceId: choice.id,
        isCorrect: true,
        questionText: "Which is right?",
      },
    ]);
  });

  it("lists only completed sittings, oldest first", async () => {
    const me = await user();
    const at = (iso: string) => new Date(iso);
    for (const [completedAt, passed] of [
      ["2026-10-02T00:00:00.000Z", true],
      ["2026-10-01T00:00:00.000Z", false],
    ] as const) {
      await prisma.examAttempt.create({
        data: { userId: me.id, examType: "VUL", score: 3, totalItems: 4, passed, completedAt: at(completedAt) },
      });
    }
    await prisma.examAttempt.create({
      data: { userId: me.id, examType: "VUL", score: 0, totalItems: 0, passed: false },
    });

    expect(await listCompletedSittings(me.id)).toEqual([
      { examType: "VUL", passed: false, score: 3, totalItems: 4, completedAt: at("2026-10-01T00:00:00.000Z") },
      { examType: "VUL", passed: true, score: 3, totalItems: 4, completedAt: at("2026-10-02T00:00:00.000Z") },
    ]);
  });
});
