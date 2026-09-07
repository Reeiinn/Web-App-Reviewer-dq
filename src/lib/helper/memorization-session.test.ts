import { describe, expect, it } from "vitest";
import { restoreMemorization } from "./memorization-session";

const question = (id: string) => ({ id }) as { id: string };
const deck = ["q1", "q2", "q3", "q4"].map(question);

describe("restoreMemorization", () => {
  it("deals a fresh set when nothing is saved", () => {
    const state = restoreMemorization(deck, null);

    expect(state.resumed).toBe(false);
    expect(state.index).toBe(0);
    expect(state.answered).toBe(0);
    expect(state.correct).toBe(0);
    expect(state.wrong).toEqual([]);
    expect([...state.questions].map((item) => item.id).sort()).toEqual([
      "q1",
      "q2",
      "q3",
      "q4",
    ]);
  });

  it("resumes on the saved question in the saved order", () => {
    const state = restoreMemorization(deck, {
      card_order: ["q3", "q1", "q4", "q2"],
      card_index: 2,
      ratings: { q3: true, q1: false },
    });

    expect(state.resumed).toBe(true);
    expect(state.questions.map((item) => item.id)).toEqual([
      "q3",
      "q1",
      "q4",
      "q2",
    ]);
    expect(state.index).toBe(2);
  });

  it("counts answers and mistakes from the saved ratings", () => {
    const state = restoreMemorization(deck, {
      card_order: ["q1", "q2", "q3", "q4"],
      card_index: 3,
      ratings: { q1: true, q2: false, q3: true },
    });

    expect(state.answered).toBe(3);
    expect(state.correct).toBe(2);
    expect(state.wrong.map((item) => item.id)).toEqual(["q2"]);
  });

  it("drops ratings for questions that left the track", () => {
    const state = restoreMemorization(deck, {
      card_order: ["q1", "q2", "gone"],
      card_index: 2,
      ratings: { q1: true, gone: false },
    });

    expect(state.questions.some((item) => item.id === "gone")).toBe(false);
    expect(state.answered).toBe(1);
    expect(state.wrong).toEqual([]);
  });

  it("starts over when the saved session ran off the end of its deck", () => {
    const state = restoreMemorization(deck, {
      card_order: ["q1", "q2"],
      card_index: 2,
      ratings: { q1: true, q2: true },
    });

    expect(state.resumed).toBe(false);
    expect(state.index).toBe(0);
    expect(state.answered).toBe(0);
  });

  it("starts over for an empty track", () => {
    const state = restoreMemorization([], {
      card_order: ["q1"],
      card_index: 0,
      ratings: {},
    });

    expect(state.questions).toEqual([]);
    expect(state.resumed).toBe(false);
  });
});
