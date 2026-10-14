// Marks every flashcard and memorization item of one track as mastered for one
// account, so that track's practice exam unlocks without sitting through both
// decks. Local database only (see scripts/local-prisma.ts).
//
// Run with: pnpm seed:mastery <email> [EXAM_TYPE]
//   EXAM_TYPE  VUL (default) | TRADITIONAL_LIFE | IIAP_A | IIAP_B
import { examTypes, isExamType } from "../src/lib/types/common";
import { localPrisma } from "./local-prisma";

const [email, examType = "VUL"] = process.argv.slice(2);

async function main() {
  if (!email) {
    console.error("Usage: pnpm seed:mastery <email> [EXAM_TYPE]");
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
      select: { id: true, name: true },
    });
    if (!user) {
      console.error(`No account found for ${email}`);
      process.exitCode = 1;
      return;
    }

    console.log(`Seeding ${examType} mastery for ${user.name} <${email}>`);

    const flashcards = await prisma.flashcard.findMany({
      where: { examType },
      select: { id: true },
    });
    // The saved answer is the correct choice, so a resumed sitting redraws
    // these as answered correctly rather than as a blank it cannot explain.
    const memorization = await prisma.memorization.findMany({
      where: { examType },
      select: {
        id: true,
        choices: {
          where: { isCorrect: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { id: true },
        },
      },
    });

    const reviewedAt = new Date();
    await prisma.$transaction([
      ...flashcards.map((card) =>
        prisma.flashcardProgress.upsert({
          where: { userId_flashcardId: { userId: user.id, flashcardId: card.id } },
          create: { userId: user.id, flashcardId: card.id, reviewedAt, mastered: true },
          update: { mastered: true, reviewedAt },
        }),
      ),
      ...memorization.map((item) => {
        const selectedChoiceId = item.choices[0]?.id ?? null;
        return prisma.memorizationProgress.upsert({
          where: {
            userId_memorizationId: { userId: user.id, memorizationId: item.id },
          },
          create: {
            userId: user.id,
            memorizationId: item.id,
            selectedChoiceId,
            isCorrect: true,
            reviewedAt,
            mastered: true,
          },
          update: { mastered: true, isCorrect: true, selectedChoiceId, reviewedAt },
        });
      }),
    ]);

    console.log(`ok  flashcards mastered:    ${flashcards.length}`);
    console.log(`ok  memorization mastered:  ${memorization.length}`);

    const [flashcardsMastered, memorizationMastered] = await Promise.all([
      prisma.flashcardProgress.count({
        where: { userId: user.id, mastered: true, flashcard: { examType } },
      }),
      prisma.memorizationProgress.count({
        where: { userId: user.id, mastered: true, memorization: { examType } },
      }),
    ]);
    console.log(
      `\n${examType}: flashcards ${flashcardsMastered}/${flashcards.length}, ` +
        `memorization ${memorizationMastered}/${memorization.length}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Seeding failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
