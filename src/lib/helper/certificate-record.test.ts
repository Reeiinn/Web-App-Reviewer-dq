import { describe, expect, it } from "vitest";
import {
  emptyRecord,
  scorePct,
  trackRecord,
  triesLabel,
  type Sitting,
} from "./certificate-record";
import { PASSES_REQUIRED } from "./practice-exam";

/** A sitting on day `day`, scored out of twenty. */
const sitting = (day: number, score: number): Sitting => ({
  passed: score >= 15, // 75% of 20, the threshold the exam is scored by
  score,
  total_items: 20,
  completed_at: `2026-01-${String(day).padStart(2, "0")}T09:00:00.000Z`,
});

const cleared = () => [
  sitting(1, 12),
  sitting(2, 14),
  sitting(3, 16),
  sitting(4, 18),
  sitting(5, 15),
  sitting(6, 17),
  sitting(7, 20),
];

describe("trackRecord", () => {
  it("reads an untouched track as nought", () => {
    expect(trackRecord([])).toEqual(emptyRecord());
  });

  it("counts every sitting a track is still open on", () => {
    const record = trackRecord([sitting(1, 10), sitting(2, 16)]);

    expect(record.cleared).toBe(false);
    expect(record.passes).toBe(1);
    expect(record.tries).toBe(2);
    expect(record.failed).toBe(1);
  });

  it("counts the failed tries a certificate cost", () => {
    const record = trackRecord(cleared());

    expect(record.cleared).toBe(true);
    expect(record.passes).toBe(PASSES_REQUIRED);
    expect(record.tries).toBe(7);
    expect(record.failed).toBe(2);
    expect(record.clearedAt).toBe(sitting(7, 20).completed_at);
  });

  it("leaves revision after the fifth pass out of the tries", () => {
    const record = trackRecord([...cleared(), sitting(8, 11), sitting(9, 19)]);

    expect(record.tries).toBe(7);
    expect(record.failed).toBe(2);
    expect(record.total).toBe(9);
    expect(record.bestPct).toBe(100);
  });

  it("orders the sittings itself, so the clearing one is the fifth pass", () => {
    const record = trackRecord([...cleared()].reverse());

    expect(record.tries).toBe(7);
    expect(record.firstAt).toBe(sitting(1, 12).completed_at);
    expect(record.clearedAt).toBe(sitting(7, 20).completed_at);
  });

  it("keeps the best score from the tries that counted", () => {
    expect(trackRecord([sitting(1, 9), sitting(2, 13)]).bestPct).toBe(65);
  });
});

describe("scorePct", () => {
  it("rounds to a whole percentage", () => {
    expect(scorePct(13, 20)).toBe(65);
    expect(scorePct(2, 3)).toBe(67);
  });

  it("reads an empty sitting as nought rather than dividing by zero", () => {
    expect(scorePct(0, 0)).toBe(0);
  });
});

describe("triesLabel", () => {
  it("keeps a single try singular", () => {
    expect(triesLabel(1)).toBe("1 try");
    expect(triesLabel(7)).toBe("7 tries");
  });
});
