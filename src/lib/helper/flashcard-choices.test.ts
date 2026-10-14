import { describe, expect, it } from "vitest";
import { choicesForCard, type QuestionForCard } from "./flashcard-choices";

const q = (
  text: string,
  correct: string,
  examType = "VUL",
  id = text,
): QuestionForCard => ({
  examType,
  text,
  choices: [
    { id: `${id}-a`, text: "wrong", isCorrect: false },
    { id: `${id}-b`, text: correct, isCorrect: true },
  ],
});

const card = (front: string, back: string, examType = "VUL") => ({
  examType,
  front,
  back,
});

describe("choicesForCard", () => {
  it("takes the only question with the card's front, whatever its answer", () => {
    expect(choicesForCard(card("Q1", "anything"), [q("Q1", "A1")])).toEqual([
      { id: "Q1-a", text: "wrong" },
      { id: "Q1-b", text: "A1" },
    ]);
  });

  it("picks, among questions sharing a front, the one whose answer is the back", () => {
    const questions = [q("Same", "First", "VUL", "one"), q("Same", "Second", "VUL", "two")];

    expect(choicesForCard(card("Same", "Second"), questions)).toEqual([
      { id: "two-a", text: "wrong" },
      { id: "two-b", text: "Second" },
    ]);
  });

  it("shows no options when shared fronts all answer something else", () => {
    const questions = [q("Same", "First", "VUL", "one"), q("Same", "Second", "VUL", "two")];

    expect(choicesForCard(card("Same", "Third"), questions)).toEqual([]);
  });

  it("ignores a question on another track", () => {
    expect(choicesForCard(card("Q1", "A1", "VUL"), [q("Q1", "A1", "IIAP_A")])).toEqual([]);
  });

  it("shows no options when no question has the front", () => {
    expect(choicesForCard(card("Lonely", "A"), [q("Q1", "A1")])).toEqual([]);
  });

  it("does not treat a wrong option equal to the back as the answer", () => {
    const questions: QuestionForCard[] = [
      q("Same", "First", "VUL", "one"),
      {
        examType: "VUL",
        text: "Same",
        choices: [{ id: "x", text: "Back", isCorrect: false }],
      },
    ];

    expect(choicesForCard(card("Same", "Back"), questions)).toEqual([]);
  });
});
