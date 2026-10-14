import { afterAll, describe, expect, it } from "vitest";
import {
  createFlashcard,
  createQuestion,
  deleteContent,
  uniqueSuffix,
} from "@/test/db-fixtures";
import { listFlashcards, listQuestions } from "./content";

// Other db test files may leave content of their own in the shared test
// database, so every assertion looks only at the rows this file made.
const made = { flashcards: [] as string[], questions: [] as string[], memorization: [] as string[] };
const mine = <T extends { id: string }>(rows: T[], ids: string[]) =>
  rows.filter((r) => ids.includes(r.id));

afterAll(async () => {
  await deleteContent(made);
});

describe("listFlashcards", () => {
  it("returns cards by category with their question's options in exam order", async () => {
    const front = `Front ${uniqueSuffix()}`;
    const question = await createQuestion({
      text: front,
      choices: [
        { text: "Second", sortOrder: 2 },
        { text: "Right", isCorrect: true, sortOrder: 1 },
      ],
    });
    made.questions.push(question.id);
    const later = await createFlashcard({ front, back: "Right", category: "Zeta" });
    const earlier = await createFlashcard({ category: "Alpha" });
    made.flashcards.push(later.id, earlier.id);

    const rows = mine(await listFlashcards({ examType: "VUL", category: null }), [later.id, earlier.id]);

    expect(rows.map((r) => r.id)).toEqual([earlier.id, later.id]);
    expect(rows[1]).toEqual({
      id: later.id,
      exam_type: "VUL",
      category: "Zeta",
      front,
      back: "Right",
      choices: [
        { id: expect.any(String), text: "Right" },
        { id: expect.any(String), text: "Second" },
      ],
    });
    expect(Object.keys(rows[1])).toEqual(["id", "exam_type", "category", "front", "back", "choices"]);
    expect(rows[0].choices).toEqual([]);
  });

  it("filters by track and category", async () => {
    const category = `Cat ${uniqueSuffix()}`;
    const vul = await createFlashcard({ category });
    const other = await createFlashcard({ category, examType: "IIAP_A" });
    made.flashcards.push(vul.id, other.id);

    expect(mine(await listFlashcards({ examType: "VUL", category }), [vul.id, other.id]).map((r) => r.id)).toEqual([vul.id]);
    expect(mine(await listFlashcards({ examType: null, category }), [vul.id, other.id])).toHaveLength(2);
  });
});

describe("listQuestions", () => {
  it("returns the newest first with every option in exam order", async () => {
    const old = await createQuestion({ createdAt: new Date("2026-01-01T00:00:00Z") });
    const recent = await createQuestion({
      createdAt: new Date("2026-02-01T00:00:00Z"),
      choices: [
        { text: "B", sortOrder: 2 },
        { text: "A", isCorrect: true, sortOrder: 1 },
      ],
    });
    made.questions.push(old.id, recent.id);

    const rows = mine(await listQuestions({ examType: "VUL", category: null }), [old.id, recent.id]);

    expect(rows.map((r) => r.id)).toEqual([recent.id, old.id]);
    expect(rows[0]).toEqual({
      id: recent.id,
      exam_type: "VUL",
      category: "Test",
      text: expect.any(String),
      explanation: null,
      difficulty: 1,
      created_at: "2026-02-01T00:00:00.000Z",
      choices: [
        { id: expect.any(String), text: "A", is_correct: true },
        { id: expect.any(String), text: "B", is_correct: false },
      ],
    });
    expect(Object.keys(rows[0])).toEqual([
      "id", "exam_type", "category", "text", "explanation", "difficulty", "created_at", "choices",
    ]);
    expect(rows[1].choices).toEqual([]);
  });
});
