import { randomUUID } from "node:crypto";
import prisma from "@/server/db/prisma";

export const uniqueSuffix = () => randomUUID().slice(0, 8);

export async function createUser(
  overrides: {
    role?: "USER" | "MANAGER" | "ADMIN";
    managerId?: string;
  } = {},
) {
  const suffix = uniqueSuffix();
  return prisma.user.create({
    data: {
      email: `test-${suffix}@example.test`,
      password: "not-a-real-hash",
      name: `Test ${suffix}`,
      role: overrides.role ?? "USER",
      managerId: overrides.managerId ?? null,
    },
    select: { id: true, email: true },
  });
}

export async function deleteUsers(...ids: string[]) {
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

type Track = "VUL" | "TRADITIONAL_LIFE" | "IIAP_A" | "IIAP_B";
type ChoiceInput = { text: string; isCorrect?: boolean; sortOrder: number };

export async function createQuestion(input: {
  examType?: Track;
  text?: string;
  category?: string;
  createdAt?: Date;
  choices?: ChoiceInput[];
}) {
  return prisma.question.create({
    data: {
      examType: input.examType ?? "VUL",
      text: input.text ?? `Question ${uniqueSuffix()}`,
      category: input.category ?? "Test",
      createdAt: input.createdAt,
      choices: { create: input.choices ?? [] },
    },
    select: { id: true },
  });
}

export async function createFlashcard(input: {
  examType?: Track;
  front?: string;
  back?: string;
  category?: string;
}) {
  return prisma.flashcard.create({
    data: {
      examType: input.examType ?? "VUL",
      front: input.front ?? `Front ${uniqueSuffix()}`,
      back: input.back ?? "Back",
      category: input.category ?? "Test",
    },
    select: { id: true },
  });
}

export async function createMemorization(input: {
  examType?: Track;
  text?: string;
  category?: string;
  choices?: ChoiceInput[];
}) {
  return prisma.memorization.create({
    data: {
      examType: input.examType ?? "VUL",
      text: input.text ?? `Item ${uniqueSuffix()}`,
      category: input.category ?? "Test",
      choices: { create: input.choices ?? [] },
    },
    select: { id: true, choices: { select: { id: true, isCorrect: true } } },
  });
}

/** Content does not cascade from users, so tests remove what they made. */
export async function deleteContent(ids: {
  flashcards?: string[];
  questions?: string[];
  memorization?: string[];
}) {
  await prisma.flashcard.deleteMany({ where: { id: { in: ids.flashcards ?? [] } } });
  await prisma.question.deleteMany({ where: { id: { in: ids.questions ?? [] } } });
  await prisma.memorization.deleteMany({ where: { id: { in: ids.memorization ?? [] } } });
}
