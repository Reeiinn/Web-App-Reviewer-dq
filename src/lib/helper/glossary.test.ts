import { describe, expect, it } from "vitest";
import { anchorsFor, detailsSearchText, normalizeDetails } from "./glossary";
import type { GlossaryTerm } from "@/lib/types/glossary";

const term = (id: string, name: string): GlossaryTerm => ({
  id,
  exam_type: "VUL",
  term: name,
  definition: "",
  details: null,
});

describe("normalizeDetails", () => {
  it("keeps a well-formed details object", () => {
    const details = normalizeDetails({
      keyPointsLabel: "Differences",
      keyPoints: [{ text: "Term pays on death", children: ["Yes."] }],
      similarities: ["Both are time-bound."],
      comparison: {
        columns: ["Feature", "Traditional", "VUL"],
        rows: [{ feature: "Premiums", values: ["Fixed", "Flexible"] }],
      },
      examples: [
        {
          label: "Revocable",
          text: "You name your spouse.",
          roles: [{ role: "Insured", who: "Daughter" }],
          note: "Ownership transfers later.",
        },
      ],
    });

    expect(details).toEqual({
      keyPointsLabel: "Differences",
      keyPoints: [{ text: "Term pays on death", children: ["Yes."] }],
      similarities: ["Both are time-bound."],
      comparison: {
        columns: ["Feature", "Traditional", "VUL"],
        rows: [{ feature: "Premiums", values: ["Fixed", "Flexible"] }],
      },
      examples: [
        {
          label: "Revocable",
          text: "You name your spouse.",
          roles: [{ role: "Insured", who: "Daughter" }],
          note: "Ownership transfers later.",
        },
      ],
    });
  });

  // Most terms are a definition and nothing else, and the column is nullable.
  it("reads a term with no details as no details", () => {
    expect(normalizeDetails(null)).toBeNull();
    expect(normalizeDetails(undefined)).toBeNull();
    expect(normalizeDetails({})).toBeNull();
  });

  // The column is jsonb, so the page cannot assume anything about its shape.
  it("refuses a value that is not an object", () => {
    expect(normalizeDetails("Face Amount")).toBeNull();
    expect(normalizeDetails(42)).toBeNull();
    expect(normalizeDetails([{ text: "loose" }])).toBeNull();
  });

  it("drops entries that are the wrong shape rather than rendering them", () => {
    const details = normalizeDetails({
      keyPoints: [{ text: "Kept" }, { text: "" }, { note: "no text" }, null],
      examples: [{ text: "Kept" }, { label: "Orphan" }],
      similarities: ["Kept", "", 7],
    });

    expect(details).toEqual({
      keyPoints: [{ text: "Kept" }],
      examples: [{ text: "Kept" }],
      similarities: ["Kept"],
    });
  });

  it("drops a comparison whose rows do not line up with its columns", () => {
    // Two side columns, one value: the table would render a ragged row.
    expect(
      normalizeDetails({
        comparison: {
          columns: ["Feature", "Traditional", "VUL"],
          rows: [{ feature: "Premiums", values: ["Fixed"] }],
        },
      }),
    ).toBeNull();

    // Fewer than two columns is not a comparison.
    expect(
      normalizeDetails({
        comparison: { columns: ["Feature"], rows: [] },
      }),
    ).toBeNull();
  });

  it("keeps the details that survive when a sibling field is dropped", () => {
    const details = normalizeDetails({
      examples: [{ text: "Kept" }],
      comparison: { columns: [], rows: [] },
    });

    expect(details).toEqual({ examples: [{ text: "Kept" }] });
  });
});

describe("detailsSearchText", () => {
  it("gathers every piece of prose a reader might search for", () => {
    const text = detailsSearchText({
      keyPointsLabel: "The four options",
      keyPoints: [
        { text: "Paid-Up Additions", children: ["Will it affect the loan?"] },
      ],
      similarities: ["Both are time-bound."],
      comparison: {
        columns: ["Feature", "Traditional", "VUL"],
        rows: [{ feature: "Premiums", values: ["Fixed", "Flexible"] }],
      },
      examples: [
        {
          label: "Irrevocable",
          text: "A divorce decree.",
          roles: [{ role: "Insured", who: "Daughter" }],
          note: "Ownership transfers later.",
        },
      ],
    });

    // Searching the glossary for "trust" should find the term whose example
    // mentions a trust, not just the ones whose definition does.
    for (const fragment of [
      "Paid-Up Additions",
      "Will it affect the loan?",
      "Both are time-bound.",
      "Premiums",
      "Flexible",
      "Irrevocable",
      "A divorce decree.",
      "Daughter",
      "Ownership transfers later.",
    ]) {
      expect(text).toContain(fragment);
    }
  });

  it("is empty for a term with no details", () => {
    expect(detailsSearchText(null)).toBe("");
    expect(detailsSearchText(undefined)).toBe("");
  });
});

describe("anchorsFor", () => {
  it("names a link target after the term", () => {
    const anchors = anchorsFor([
      term("a", "Face Amount"),
      term("b", "Traditional vs. Variable Universal Life (VUL)"),
    ]);

    expect(anchors.get("a")).toBe("face-amount");
    expect(anchors.get("b")).toBe("traditional-vs-variable-universal-life-vul");
  });

  // Terms are unique per track, not outright, so the same name can appear
  // twice; without a suffix the second card would be unreachable.
  it("keeps a repeated term reachable", () => {
    const anchors = anchorsFor([
      term("a", "Beneficiary"),
      term("b", "Beneficiary"),
      term("c", "Beneficiary"),
    ]);

    expect([...anchors.values()]).toEqual([
      "beneficiary",
      "beneficiary-2",
      "beneficiary-3",
    ]);
  });

  it("falls back to a usable anchor when a term has no letters", () => {
    expect(anchorsFor([term("a", "???")]).get("a")).toBe("term");
  });
});
