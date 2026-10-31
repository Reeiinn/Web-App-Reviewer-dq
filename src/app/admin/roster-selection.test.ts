import { describe, expect, it } from "vitest";
import { pageCheckState, pruneSelection, togglePage } from "./roster-selection";

describe("pruneSelection", () => {
  it("keeps ticks on other pages of the same list", () => {
    expect([...pruneSelection(new Set(["a", "z"]), ["a", "b", "z"])]).toEqual([
      "a",
      "z",
    ]);
  });

  // Nobody should delete a row they cannot see.
  it("drops ticks a filter has hidden", () => {
    expect([...pruneSelection(new Set(["a", "gone"]), ["a", "b"])]).toEqual([
      "a",
    ]);
  });

  it("hands back the same set when nothing changed", () => {
    const selected = new Set(["a"]);
    expect(pruneSelection(selected, ["a", "b"])).toBe(selected);
  });
});

describe("togglePage", () => {
  it("ticks a whole page without touching others", () => {
    expect([...togglePage(new Set(["x"]), ["a", "b"], true)].sort()).toEqual([
      "a",
      "b",
      "x",
    ]);
  });

  it("unticks a whole page", () => {
    expect([...togglePage(new Set(["a", "b", "x"]), ["a", "b"], false)]).toEqual(
      ["x"],
    );
  });
});

describe("pageCheckState", () => {
  it("reports none, some and all", () => {
    expect(pageCheckState(new Set(), ["a", "b"])).toBe("none");
    expect(pageCheckState(new Set(["a"]), ["a", "b"])).toBe("some");
    expect(pageCheckState(new Set(["a", "b"]), ["a", "b"])).toBe("all");
  });

  it("reads an empty page as none", () => {
    expect(pageCheckState(new Set(), [])).toBe("none");
  });
});
