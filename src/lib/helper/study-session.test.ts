import { describe, expect, it } from "vitest";
import { shuffleUnstudied } from "./study-session";

const card = (id: string) => ({ id });
const deck = ["c1", "c2", "c3", "c4", "c5", "c6"].map(card);
const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe("shuffleUnstudied", () => {
  it("leaves every rated card in the slot it already occupied", () => {
    // c2 and c5 are studied, so slots 1 and 4 are theirs whatever the shuffle
    // does with the rest.
    const ratings = { c2: true, c5: false };

    for (let run = 0; run < 50; run++) {
      const result = ids(shuffleUnstudied(deck, ratings));

      expect(result[1]).toBe("c2");
      expect(result[4]).toBe("c5");
    }
  });

  it("keeps the deck itself intact — the same cards, no drops or duplicates", () => {
    const result = shuffleUnstudied(deck, { c3: true });

    expect(ids(result).sort()).toEqual(["c1", "c2", "c3", "c4", "c5", "c6"]);
  });

  it("redeals the un-rated cards rather than handing the deck back untouched", () => {
    const ratings = { c2: true };
    const original = ids(deck);

    const moved = Array.from({ length: 50 }, () =>
      ids(shuffleUnstudied(deck, ratings)),
    ).some((result) => result.join() !== original.join());

    expect(moved).toBe(true);
  });

  it("deals un-rated cards only into slots that held un-rated cards", () => {
    const ratings = { c2: true, c5: false };
    const studiedSlots = [1, 4];

    const result = ids(shuffleUnstudied(deck, ratings));

    // Everything outside the studied slots came from the un-rated pool.
    result.forEach((id, slot) => {
      if (!studiedSlots.includes(slot)) {
        expect(["c1", "c3", "c4", "c6"]).toContain(id);
      }
    });
  });

  it("changes nothing when every card has been rated", () => {
    const ratings = { c1: true, c2: false, c3: true, c4: true, c5: false, c6: true };

    expect(ids(shuffleUnstudied(deck, ratings))).toEqual(ids(deck));
  });

  it("treats a wrong answer as studied, not just a right one", () => {
    const result = ids(shuffleUnstudied(deck, { c4: false }));

    expect(result[3]).toBe("c4");
  });

  it("handles an empty deck", () => {
    expect(shuffleUnstudied([], {})).toEqual([]);
  });
});
