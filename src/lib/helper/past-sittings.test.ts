import { describe, expect, it } from "vitest";
import type { Question } from "@/lib/types/questions";
import { reviewRows, sittingSummary } from "./past-sittings";

const question = (id: string) =>
  ({ id, text: id, choices: [] }) as unknown as Question;

describe("reviewRows", () => {
  it("follows the order the paper was dealt in", () => {
    const rows = reviewRows(
      ["b", "a"],
      [
        { question_id: "a", selected_choice_id: "a1", is_correct: true },
        { question_id: "b", selected_choice_id: "b2", is_correct: false },
      ],
      [question("a"), question("b")],
    );
    expect(rows.map((row) => row.questionId)).toEqual(["b", "a"]);
  });

  it("carries each pick and whether it was right", () => {
    const [row] = reviewRows(
      ["a"],
      [{ question_id: "a", selected_choice_id: "a1", is_correct: true }],
      [question("a")],
    );
    expect(row).toMatchObject({ chosen: "a1", correct: true });
  });

  it("marks a question left blank as unanswered", () => {
    expect(reviewRows(["a"], [], [question("a")])[0]).toMatchObject({
      chosen: undefined,
      correct: false,
    });
  });

  it("keeps a question that has left the bank", () => {
    expect(
      reviewRows(
        null,
        [{ question_id: "gone", selected_choice_id: "x", is_correct: true }],
        [],
      )[0],
    ).toMatchObject({ questionId: "gone", question: null, chosen: "x" });
  });
});

describe("sittingSummary", () => {
  it("summarises a score", () => {
    expect(sittingSummary(38, 50)).toBe("38 / 50 · 76%");
  });

  it("summarises an empty paper", () => {
    expect(sittingSummary(0, 0)).toBe("0 / 0 · 0%");
  });
});
