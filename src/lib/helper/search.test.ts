import { describe, expect, it, vi } from "vitest";
import { filterSearch, indexForSearch, searchNeedle } from "./search";

type Row = { name: string; email: string; manager?: string | null };

const rows: Row[] = [
  { name: "Ada Lovelace", email: "ada@example.com", manager: "Grace Hopper" },
  { name: "Alan Turing", email: "alan@example.com", manager: null },
  { name: "Grace Hopper", email: "grace@example.com" },
];

const index = indexForSearch(rows, (row) => [row.name, row.email, row.manager]);

describe("searchNeedle", () => {
  it("folds a typed box into what it searches for", () => {
    expect(searchNeedle("  Ada  ")).toBe("ada");
    expect(searchNeedle("   ")).toBe("");
  });
});

describe("filterSearch", () => {
  it("keeps every row when nothing is typed", () => {
    expect(filterSearch(index, "")).toEqual(rows);
  });

  it("matches any of the indexed fields, whatever the case", () => {
    expect(filterSearch(index, "lovelace").map((row) => row.name)).toEqual([
      "Ada Lovelace",
    ]);
    expect(filterSearch(index, "alan@example").map((row) => row.name)).toEqual([
      "Alan Turing",
    ]);
    // Ada is found by her manager's name as well as her own.
    expect(filterSearch(index, "hopper").map((row) => row.name)).toEqual([
      "Ada Lovelace",
      "Grace Hopper",
    ]);
  });

  it("leaves out rows the other filters reject", () => {
    const kept = filterSearch(
      index,
      "example",
      (row) => row.name !== "Alan Turing",
    );
    expect(kept.map((row) => row.name)).toEqual([
      "Ada Lovelace",
      "Grace Hopper",
    ]);
  });

  it("skips a field that is not there", () => {
    expect(filterSearch(index, "null")).toEqual([]);
  });

  it("folds each row once, not once per keystroke", () => {
    const fields = vi.fn((row: Row) => [row.name, row.email]);
    const built = indexForSearch(rows, fields);

    expect(fields).toHaveBeenCalledTimes(rows.length);

    for (const needle of ["a", "ad", "ada"]) filterSearch(built, needle);

    expect(fields).toHaveBeenCalledTimes(rows.length);
  });
});
