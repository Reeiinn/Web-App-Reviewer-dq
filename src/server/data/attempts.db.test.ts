import { afterAll, describe, expect, it, vi } from "vitest";
import prisma from "@/server/db/prisma";
import {
  createQuestion,
  createUser,
  deleteContent,
  deleteUsers,
} from "@/test/db-fixtures";
import {
  choiceCorrectness,
  completeAttempt,
  findAttempt,
  findAttemptOwner,
  findOpenAttempt,
  listAttemptAnswers,
  listCompletedSittings,
  openAttempt,
  recordExamAnswer,
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

/** A sitting on a fresh track of `n` questions, with each question's right and wrong choice. */
async function sitting(n: number) {
  const me = await user();
  const qs: { id: string; right: string; wrong: string }[] = [];
  for (let i = 0; i < n; i++) {
    const id = await question("VUL");
    const choices = await prisma.choice.findMany({
      where: { questionId: id },
      select: { id: true, isCorrect: true },
    });
    qs.push({
      id,
      right: choices.find((c) => c.isCorrect)!.id,
      wrong: choices.find((c) => !c.isCorrect)!.id,
    });
  }
  const { attempt } = await openAttempt(me.id, "VUL");
  return { me, qs, attempt };
}

const answer = (
  s: Awaited<ReturnType<typeof sitting>>,
  i: number,
  right: boolean,
) =>
  recordExamAnswer({
    attemptId: s.attempt.id,
    userId: s.me.id,
    questionId: s.qs[i].id,
    selectedChoiceId: right ? s.qs[i].right : s.qs[i].wrong,
    isCorrect: right,
  });

const progressOf = (userId: string, questionId: string) =>
  prisma.questionProgress.findUniqueOrThrow({
    where: { userId_questionId: { userId, questionId } },
    select: { isCorrect: true, timesSeen: true, timesCorrect: true, mastered: true },
  });

describe("answers", () => {
  it("knows an attempt's owner, and null for no attempt", async () => {
    const s = await sitting(1);
    expect(await findAttemptOwner(s.attempt.id)).toBe(s.me.id);
    expect(await findAttemptOwner("00000000-0000-4000-8000-000000000000")).toBeNull();
  });

  it("says whether a choice is right, and null for another question's choice", async () => {
    const s = await sitting(2);
    expect(await choiceCorrectness(s.qs[0].right, s.qs[0].id)).toBe(true);
    expect(await choiceCorrectness(s.qs[0].wrong, s.qs[0].id)).toBe(false);
    expect(await choiceCorrectness(s.qs[1].right, s.qs[0].id)).toBeNull();
  });

  it("saves an answer and the learner's question progress", async () => {
    const s = await sitting(1);

    const saved = await answer(s, 0, true);

    expect(saved).toEqual({
      id: expect.any(String),
      attemptId: s.attempt.id,
      questionId: s.qs[0].id,
      selectedChoiceId: s.qs[0].right,
      isCorrect: true,
    });
    expect(await progressOf(s.me.id, s.qs[0].id)).toEqual({
      isCorrect: true,
      timesSeen: 1,
      timesCorrect: 1,
      mastered: true,
    });
  });

  it("replaces a changed answer, and a wrong one un-masters the question", async () => {
    const s = await sitting(1);
    const first = await answer(s, 0, true);

    const second = await answer(s, 0, false);

    expect(second.id).toBe(first.id);
    expect(second).toMatchObject({ selectedChoiceId: s.qs[0].wrong, isCorrect: false });
    expect(await prisma.examAttemptAnswer.count({ where: { attemptId: s.attempt.id } })).toBe(1);
    expect(await progressOf(s.me.id, s.qs[0].id)).toEqual({
      isCorrect: false,
      timesSeen: 2,
      timesCorrect: 1,
      mastered: false,
    });
  });

  it("keeps one answer row when the same answer arrives twice at once", async () => {
    const s = await sitting(1);

    await Promise.all([answer(s, 0, true), answer(s, 0, true)]);

    expect(await prisma.examAttemptAnswer.count({ where: { attemptId: s.attempt.id } })).toBe(1);
    expect(await progressOf(s.me.id, s.qs[0].id)).toMatchObject({ timesSeen: 2, timesCorrect: 2 });
  });
});

describe("completeAttempt", () => {
  const passCount = (userId: string) =>
    prisma.userProgress.findUnique({
      where: { userId_examType: { userId, examType: "VUL" } },
      select: { passCount: true },
    });

  it("scores the saved answers and counts a pass at 75%", async () => {
    const s = await sitting(4);
    await answer(s, 0, true);
    await answer(s, 1, true);
    await answer(s, 2, true);
    await answer(s, 3, false);

    const { attempt, passes } = await completeAttempt(s.attempt.id);

    expect(attempt).toMatchObject({ id: s.attempt.id, score: 3, totalItems: 4, passed: true });
    expect(attempt.completedAt).toBeInstanceOf(Date);
    expect(passes).toBe(1);
    expect(await passCount(s.me.id)).toEqual({ passCount: 1 });
  });

  it("records a fail without touching the pass count", async () => {
    const s = await sitting(4);
    await answer(s, 0, true);
    await answer(s, 1, true);
    await answer(s, 2, false);
    await answer(s, 3, false);

    const { attempt, passes } = await completeAttempt(s.attempt.id);

    expect(attempt).toMatchObject({ score: 2, totalItems: 4, passed: false });
    expect(passes).toBe(0);
    expect(await passCount(s.me.id)).toBeNull();
  });

  it("counts passes off the completed sittings, not the open one", async () => {
    const s = await sitting(1);
    await answer(s, 0, true);
    await completeAttempt(s.attempt.id);

    const next = await openAttempt(s.me.id, "VUL");
    await recordExamAnswer({
      attemptId: next.attempt.id,
      userId: s.me.id,
      questionId: s.qs[0].id,
      selectedChoiceId: s.qs[0].right,
      isCorrect: true,
    });
    const { passes } = await completeAttempt(next.attempt.id);

    expect(passes).toBe(2);
    expect(await passCount(s.me.id)).toEqual({ passCount: 2 });
  });
});

describe("one clock", () => {
  it("stamps started_at and completed_at from the app's clock, not two", async () => {
    const s = await sitting(1);
    await prisma.examAttempt.update({
      where: { id: s.attempt.id },
      data: { completedAt: new Date() },
    });

    // Only Date is faked, so Prisma's own timers keep running.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2031-03-01T00:00:00.000Z"));
    try {
      const { attempt } = await openAttempt(s.me.id, "VUL");
      expect(attempt.startedAt.toISOString()).toBe("2031-03-01T00:00:00.000Z");

      await answer({ ...s, attempt }, 0, true);
      const { attempt: done } = await completeAttempt(attempt.id);
      expect(done.completedAt!.getTime()).toBeGreaterThanOrEqual(done.startedAt.getTime());
    } finally {
      vi.useRealTimers();
    }
  });
});
