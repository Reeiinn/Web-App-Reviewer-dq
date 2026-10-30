import { afterAll, describe, expect, it } from "vitest";
import prisma from "./prisma";
import { createUser, deleteUsers, uniqueSuffix } from "@/test/db-fixtures";

/**
 * What a hard delete of a user must take with it, and what it must keep.
 * Nothing in the app hard-deletes today ("Remove" stamps deleted_at), but the
 * schema promises this, and every new table that references users joins the
 * list below.
 */
const CASCADE_TABLES = [
  "flashcard_progress",
  "memorization_progress",
  "question_progress",
  "user_progress",
  "exam_attempts",
  "certificates",
  "study_sessions",
  "study_streaks",
  "recent_activity",
  "password_reset_tokens",
  "user_focus_tracks",
  "exam_results",
] as const;

describe("deleting a user", () => {
  const content: { flashcard?: string; memorization?: string; question?: string } = {};
  let bystander: string | undefined;

  afterAll(async () => {
    if (bystander) await deleteUsers(bystander);
    if (content.flashcard) await prisma.flashcard.delete({ where: { id: content.flashcard } });
    if (content.memorization) await prisma.memorization.delete({ where: { id: content.memorization } });
    if (content.question) await prisma.question.delete({ where: { id: content.question } });
  });

  it("removes every row they own and keeps the audit trail", async () => {
    const user = await createUser();
    bystander = (await createUser()).id;
    const s = uniqueSuffix();
    const later = () => new Date(Date.now() + 60_000);

    const flashcard = await prisma.flashcard.create({
      data: { examType: "VUL", category: "t", front: "f", back: "b" },
    });
    const memorization = await prisma.memorization.create({
      data: { examType: "VUL", category: "t", text: "m" },
    });
    const question = await prisma.question.create({
      data: { examType: "VUL", category: "t", text: "q" },
    });
    Object.assign(content, {
      flashcard: flashcard.id,
      memorization: memorization.id,
      question: question.id,
    });

    await prisma.flashcardProgress.create({ data: { userId: user.id, flashcardId: flashcard.id } });
    await prisma.memorizationProgress.create({ data: { userId: user.id, memorizationId: memorization.id } });
    await prisma.questionProgress.create({
      data: { userId: user.id, questionId: question.id, isCorrect: true },
    });
    await prisma.userProgress.create({ data: { userId: user.id, examType: "VUL" } });
    const attempt = await prisma.examAttempt.create({
      data: { userId: user.id, examType: "VUL", score: 1, totalItems: 1, passed: true },
    });
    await prisma.examAttemptAnswer.create({
      data: { attemptId: attempt.id, questionId: question.id, isCorrect: true },
    });
    await prisma.certificate.create({
      data: { userId: user.id, examType: "VUL", certificateNo: `T-${s}` },
    });
    await prisma.studySession.create({ data: { userId: user.id, examType: "VUL", mode: "flashcards" } });
    await prisma.studyStreak.create({ data: { userId: user.id, examType: "VUL" } });
    await prisma.recentActivity.create({ data: { userId: user.id, examType: "VUL", mode: "flashcards" } });
    await prisma.userFocusTrack.create({ data: { userId: user.id, examType: "VUL" } });
    await prisma.examResult.create({
      data: { userId: user.id, examType: "VUL", outcome: "PASSED", markedBy: bystander },
    });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: `h-${s}`, expiresAt: later() },
    });
    await prisma.registrationInvite.create({
      data: { code: `c-${s}`, createdBy: user.id, expiresAt: later() },
    });
    // Received by the user: goes with them.
    await prisma.nudge.create({
      data: { userId: user.id, senderId: bystander, senderName: "B", message: "hi" },
    });
    // Sent by the user: kept, sender cleared, name kept.
    const sent = await prisma.nudge.create({
      data: { userId: bystander, senderId: user.id, senderName: "Leaver", message: "go" },
    });
    const audit = await prisma.adminAction.create({
      data: {
        actorId: user.id,
        actorEmail: user.email,
        actorRole: "USER",
        action: "test",
        targetId: user.id,
        targetEmail: user.email,
        targetName: "Leaver",
      },
    });

    await deleteUsers(user.id);

    for (const table of CASCADE_TABLES) {
      const [{ count }] = await prisma.$queryRawUnsafe<{ count: number }[]>(
        `SELECT count(*)::int AS count FROM ${table} WHERE user_id = $1::uuid`,
        user.id,
      );
      expect(count, table).toBe(0);
    }
    expect(await prisma.examAttemptAnswer.count({ where: { attemptId: attempt.id } })).toBe(0);
    expect(await prisma.registrationInvite.count({ where: { createdBy: user.id } })).toBe(0);
    expect(await prisma.nudge.count({ where: { userId: user.id } })).toBe(0);

    const keptNudge = await prisma.nudge.findUniqueOrThrow({ where: { id: sent.id } });
    expect(keptNudge.senderId).toBeNull();
    expect(keptNudge.senderName).toBe("Leaver");

    const keptAudit = await prisma.adminAction.findUniqueOrThrow({ where: { id: audit.id } });
    expect(keptAudit.actorId).toBeNull();
    expect(keptAudit.targetId).toBeNull();
    expect(keptAudit.actorEmail).toBe(user.email);
    expect(keptAudit.targetName).toBe("Leaver");
  });
});
