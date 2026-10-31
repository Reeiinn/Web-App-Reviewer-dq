import { describe, expect, it } from "vitest";
import type { Question } from "@/lib/types/questions";
import {
  NOT_SAT_MESSAGE,
  OPEN_SITTING_MESSAGE,
  answerKeyAccess,
  withoutAnswers,
} from "./answer-key";

const reviewee = {
  role: "USER",
  licensed: false,
  openSitting: false,
  finishedSittings: 1,
};

describe("answerKeyAccess", () => {
  it("lets a reviewee read the key after finishing a sitting", () => {
    expect(answerKeyAccess(reviewee)).toEqual({ ok: true });
  });

  it("refuses while a sitting is open, whatever came before", () => {
    expect(
      answerKeyAccess({ ...reviewee, openSitting: true, finishedSittings: 4 }),
    ).toEqual({ ok: false, error: OPEN_SITTING_MESSAGE });
  });

  it("refuses before the first sitting", () => {
    expect(answerKeyAccess({ ...reviewee, finishedSittings: 0 })).toEqual({
      ok: false,
      error: NOT_SAT_MESSAGE,
    });
  });

  it("opens to a licensed reviewee, whose sittings are closed anyway", () => {
    expect(
      answerKeyAccess({
        ...reviewee,
        licensed: true,
        openSitting: true,
        finishedSittings: 0,
      }),
    ).toEqual({ ok: true });
  });

  it("does not apply to staff", () => {
    expect(
      answerKeyAccess({ ...reviewee, role: "MANAGER", finishedSittings: 0 }),
    ).toEqual({ ok: true });
  });
});

describe("withoutAnswers", () => {
  it("drops the marked option and the explanation, and nothing else", () => {
    const question: Question = {
      id: "q1",
      exam_type: "VUL",
      category: "Basics",
      text: "Q?",
      explanation: "Because A.",
      difficulty: 1,
      created_at: "2026-10-14T01:00:00.000Z",
      choices: [
        { id: "a", text: "A", is_correct: true },
        { id: "b", text: "B", is_correct: false },
      ],
    };

    expect(withoutAnswers([question])).toEqual([
      {
        ...question,
        explanation: null,
        choices: [
          { id: "a", text: "A" },
          { id: "b", text: "B" },
        ],
      },
    ]);
  });
});
