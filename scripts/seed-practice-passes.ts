// Fills in the five passing practice-exam sittings a track needs, so the
// certificate can be looked at without sitting the exam five times. Local
// database only (see scripts/local-prisma.ts).
//
// The sittings are written the way the app writes them — a dealt paper, an
// answer row per question, a score that clears the pass mark — so the result
// screen, the attempt history and the admin roster all read the same story
// the certificate does.
//
// Run with: pnpm seed:passes <email> [EXAM_TYPE] [--fresh]
//   EXAM_TYPE  VUL (default) | TRADITIONAL_LIFE | IIAP_A | IIAP_B
//   --fresh    clear this track's existing sittings first, instead of
//              topping the count up to five
import { randomUUID } from "node:crypto";
import type { Prisma } from "../src/generated/prisma/client";
import { certificateNumber } from "../src/lib/helper/certificate-number";
import {
  hasPassedTrack,
  PASSES_REQUIRED,
  PASSING_PERCENTAGE,
  sittingPassed,
} from "../src/lib/helper/practice-exam";
import { examTypes, isExamType, type ExamType } from "../src/lib/types/common";
import { localPrisma } from "./local-prisma";

const args = process.argv.slice(2);
const FRESH = args.includes("--fresh");
const [email, examType = "VUL"] = args.filter((a) => !a.startsWith("--"));

// A row of identical 100% sittings looks seeded. These are the shares of the
// paper each sitting gets right — all clear of the bar, none of them perfect.
const SITTING_ACCURACY = [0.8, 0.86, 0.84, 0.92, 0.96];

const DAY_MS = 24 * 60 * 60 * 1000;
const SITTING_MS = 38 * 60 * 1000;

type PaperQuestion = { id: string; correctId: string; wrongId: string | null };

const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/** The passing count the app would read for this user and track. */
const countPasses = (tx: Prisma.TransactionClient, userId: string, track: ExamType) =>
  tx.examAttempt.count({
    where: { userId, examType: track, passed: true, completedAt: { not: null } },
  });

/** One sitting: a dealt paper, an answer per question, and a completed row. */
async function seedSitting(
  tx: Prisma.TransactionClient,
  userId: string,
  track: ExamType,
  questions: PaperQuestion[],
  accuracy: number,
  daysAgo: number,
) {
  const deck = shuffle(questions);
  const total = deck.length;

  // The pass mark is the floor whatever the target accuracy rounds to, so a
  // short paper can never round a sitting below the bar it is meant to clear.
  const correctCount = Math.max(
    Math.ceil((total * PASSING_PERCENTAGE) / 100),
    Math.floor(total * accuracy),
  );

  const answers = deck.map((question, index) => {
    // A question with no wrong choice on file can only be answered correctly,
    // so it is never one of the misses.
    const missed = index >= correctCount && question.wrongId !== null;
    return {
      questionId: question.id,
      selectedChoiceId: missed ? question.wrongId : question.correctId,
      isCorrect: !missed,
    };
  });
  const score = answers.filter((a) => a.isCorrect).length;

  const startedAt = new Date(Date.now() - daysAgo * DAY_MS);
  const attempt = await tx.examAttempt.create({
    data: {
      userId,
      examType: track,
      score,
      totalItems: total,
      passed: sittingPassed(score, total),
      questionOrder: deck.map((q) => q.id),
      startedAt,
      completedAt: new Date(startedAt.getTime() + SITTING_MS),
    },
    select: { id: true, score: true, totalItems: true },
  });

  await tx.examAttemptAnswer.createMany({
    data: answers.map((a) => ({ ...a, attemptId: attempt.id })),
  });

  return attempt;
}

async function main() {
  if (!email) {
    console.error("Usage: pnpm seed:passes <email> [EXAM_TYPE] [--fresh]");
    process.exitCode = 1;
    return;
  }
  if (!isExamType(examType)) {
    console.error(
      `Unknown exam type "${examType}". Pick one of: ${examTypes.join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }

  const prisma = localPrisma();
  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, name: true, role: true },
    });
    if (!user) {
      console.error(`No account found for ${email}`);
      process.exitCode = 1;
      return;
    }

    // Staff are redirected off /certificates, so seeding one for an admin or
    // a manager would produce a certificate nobody can open.
    if (user.role === "ADMIN" || user.role === "MANAGER") {
      console.error(
        `${email} is a ${user.role}. Staff are redirected away from ` +
          `/certificates, so seed a learner account instead.`,
      );
      process.exitCode = 1;
      return;
    }

    const rows = await prisma.question.findMany({
      where: { examType },
      select: {
        id: true,
        choices: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, isCorrect: true },
        },
      },
    });
    const questions: PaperQuestion[] = rows.flatMap((q) => {
      const correct = q.choices.find((c) => c.isCorrect);
      const wrong = q.choices.find((c) => !c.isCorrect);
      return correct ? [{ id: q.id, correctId: correct.id, wrongId: wrong?.id ?? null }] : [];
    });

    if (questions.length === 0) {
      console.error(
        `No answerable ${examType} questions in the database — nothing to ` +
          `build a sitting out of.`,
      );
      process.exitCode = 1;
      return;
    }

    console.log(`Seeding ${examType} passes for ${user.name} <${email}>`);
    console.log(`    paper: ${questions.length} questions\n`);

    const passes = await prisma.$transaction(
      async (tx) => {
        if (FRESH) {
          const cleared = await tx.examAttempt.deleteMany({
            where: { userId: user.id, examType },
          });
          console.log(`--fresh  cleared ${cleared.count} existing sittings`);
        }

        const before = await countPasses(tx, user.id, examType);
        const needed = Math.max(0, PASSES_REQUIRED - before);
        if (needed === 0) {
          console.log(`Already ${before} passes on file — no sittings added.`);
        }

        for (let i = 0; i < needed; i++) {
          const accuracy = SITTING_ACCURACY[(before + i) % SITTING_ACCURACY.length];
          // Newest sitting last, so the history reads as a run of study days
          // rather than five sittings stacked on one timestamp.
          const sitting = await seedSitting(
            tx,
            user.id,
            examType,
            questions,
            accuracy,
            needed - i,
          );
          const pct = Math.round((sitting.score / sitting.totalItems) * 100);
          console.log(
            `ok  sitting ${before + i + 1}: ` +
              `${sitting.score}/${sitting.totalItems} (${pct}%)`,
          );
        }

        const after = await countPasses(tx, user.id, examType);

        // The running total is kept in step with the attempts it summarises,
        // so the dashboard cannot disagree with the roster.
        await tx.userProgress.upsert({
          where: { userId_examType: { userId: user.id, examType } },
          create: { userId: user.id, examType, passCount: after },
          update: { passCount: after },
        });

        // Issued the way the app issues one on the fifth pass, so a seeded
        // certificate is indistinguishable from an earned one. A certificate
        // already on file is kept.
        if (hasPassedTrack(after)) {
          const issuedAt = new Date();
          await tx.certificate.upsert({
            where: { userId_examType: { userId: user.id, examType } },
            create: {
              userId: user.id,
              examType,
              issuedAt,
              certificateNo: certificateNumber(examType, issuedAt, randomUUID()),
            },
            update: {},
          });
        }

        return after;
      },
      { timeout: 60_000 },
    );

    const certificate = await prisma.certificate.findUnique({
      where: { userId_examType: { userId: user.id, examType } },
      select: { id: true, certificateNo: true },
    });

    console.log(`\n${examType}: passes ${passes}/${PASSES_REQUIRED}`);
    if (certificate) {
      console.log(`ok  certificate ${certificate.certificateNo}`);
      console.log(`    open /certificates`);
      console.log(`    or   /certificates/${certificate.id}`);
    } else {
      console.log("No certificate issued — the track is not cleared yet.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Seeding failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
