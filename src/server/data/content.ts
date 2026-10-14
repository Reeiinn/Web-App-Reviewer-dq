import "server-only";
import prisma from "@/server/db/prisma";
import { choicesForCard } from "@/lib/helper/flashcard-choices";
import type { ExamType } from "@/lib/types/common";
import type { Flashcard } from "@/lib/types/flashcard";
import type { Question } from "@/lib/types/questions";

/**
 * Study material: flashcards, memorization items, practice questions and the
 * glossary. Reads return the API's own shapes from src/lib/types, which are
 * the response contract, so routes pass them straight through.
 *
 * Rows on the legacy IIAP track still exist and have always been returned
 * when no track is asked for, so exam_type is cast rather than filtered.
 */

export type ContentFilter = {
  examType: ExamType | null;
  category: string | null;
};

const whereOf = ({ examType, category }: ContentFilter) => ({
  examType: examType ?? undefined,
  category: category || undefined,
});

/** Flashcards by category, each with the options of the question behind it. */
export async function listFlashcards(filter: ContentFilter): Promise<Flashcard[]> {
  const cards = await prisma.flashcard.findMany({
    where: whereOf(filter),
    orderBy: { category: "asc" },
    select: { id: true, examType: true, category: true, front: true, back: true },
  });
  if (cards.length === 0) return [];

  const questions = await prisma.question.findMany({
    where: {
      examType: { in: [...new Set(cards.map((c) => c.examType))] },
      text: { in: [...new Set(cards.map((c) => c.front))] },
    },
    select: {
      examType: true,
      text: true,
      choices: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, text: true, isCorrect: true },
      },
    },
  });

  return cards.map((card) => ({
    id: card.id,
    exam_type: card.examType as ExamType,
    category: card.category,
    front: card.front,
    back: card.back,
    choices: choicesForCard(card, questions),
  }));
}

/** Practice questions, newest first, with their options in exam order. */
export async function listQuestions(filter: ContentFilter): Promise<Question[]> {
  const rows = await prisma.question.findMany({
    where: whereOf(filter),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      examType: true,
      category: true,
      text: true,
      explanation: true,
      difficulty: true,
      createdAt: true,
      choices: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, text: true, isCorrect: true },
      },
    },
  });

  return rows.map((q) => ({
    id: q.id,
    exam_type: q.examType as ExamType,
    category: q.category,
    text: q.text,
    explanation: q.explanation,
    difficulty: q.difficulty as number,
    created_at: q.createdAt.toISOString(),
    choices: q.choices.map((c) => ({ id: c.id, text: c.text, is_correct: c.isCorrect })),
  }));
}
