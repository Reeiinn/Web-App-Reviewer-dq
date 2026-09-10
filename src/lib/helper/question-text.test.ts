import { describe, expect, it } from "vitest";
import { labelChoices, splitStatements } from "./question-text";

describe("splitStatements", () => {
  it("returns the whole text as the prompt when nothing is enumerated", () => {
    expect(splitStatements("Which of the following is FALSE?")).toEqual({
      prompt: "Which of the following is FALSE?",
      statements: [],
    });
  });

  it("splits roman-numeral statements away from the prompt", () => {
    const split = splitStatements(
      "The benefits include ___________: I. Switch funds II. Take premium holidays",
    );
    expect(split.prompt).toBe("The benefits include ___________:");
    expect(split.statements).toEqual([
      "I. Switch funds",
      "II. Take premium holidays",
    ]);
  });
});

describe("labelChoices", () => {
  it("returns an empty list when the card carries no choices", () => {
    expect(labelChoices(undefined)).toEqual([]);
    expect(labelChoices([])).toEqual([]);
  });

  it("labels choices A, B, C, D in the order given", () => {
    const labelled = labelChoices([
      { id: "c1", text: "Identifies the applicant" },
      { id: "c2", text: "Describes the type of insurance applied for" },
      { id: "c3", text: "Relates to the insurability of the applicant" },
      { id: "c4", text: "Describes the desired benefits" },
    ]);

    expect(labelled.map((choice) => choice.letter)).toEqual([
      "A",
      "B",
      "C",
      "D",
    ]);
    expect(labelled[2]).toEqual({
      id: "c3",
      letter: "C",
      text: "Relates to the insurability of the applicant",
    });
  });

  it("keeps labelling past D when a question carries more than four choices", () => {
    const labelled = labelChoices(
      Array.from({ length: 6 }, (_, index) => ({
        id: `c${index}`,
        text: `choice ${index}`,
      })),
    );

    expect(labelled.map((choice) => choice.letter)).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
    ]);
  });

  it("drops choices whose text is blank so an empty chip never renders", () => {
    const labelled = labelChoices([
      { id: "c1", text: "Real choice" },
      { id: "c2", text: "   " },
      { id: "c3", text: "Another real choice" },
    ]);

    expect(labelled).toEqual([
      { id: "c1", letter: "A", text: "Real choice" },
      { id: "c3", letter: "B", text: "Another real choice" },
    ]);
  });

  it("trims surrounding whitespace from choice text", () => {
    expect(labelChoices([{ id: "c1", text: "  Level Term  " }])).toEqual([
      { id: "c1", letter: "A", text: "Level Term" },
    ]);
  });

  it("moves an all-of-the-above option last so the options after it are not orphaned", () => {
    const labelled = labelChoices([
      { id: "c1", text: "retirement" },
      { id: "c2", text: "all of the above" },
      { id: "c3", text: "death" },
      { id: "c4", text: "disability" },
    ]);

    expect(labelled.map((choice) => choice.text)).toEqual([
      "retirement",
      "death",
      "disability",
      "all of the above",
    ]);
    expect(labelled[3].letter).toBe("D");
  });

  it("moves none-of-the-above and any-or-all-of-the-above last too", () => {
    expect(
      labelChoices([
        { id: "c1", text: "None of the above" },
        { id: "c2", text: "A real option" },
      ]).map((choice) => choice.text),
    ).toEqual(["A real option", "None of the above"]);

    expect(
      labelChoices([
        { id: "c1", text: "any or all of the above." },
        { id: "c2", text: "A real option" },
      ]).map((choice) => choice.text),
    ).toEqual(["A real option", "any or all of the above."]);
  });

  it("keeps the given order among the options that are not all-of-the-above", () => {
    const labelled = labelChoices([
      { id: "c1", text: "Zebra" },
      { id: "c2", text: "Apple" },
      { id: "c3", text: "Mango" },
    ]);

    expect(labelled.map((choice) => choice.text)).toEqual([
      "Zebra",
      "Apple",
      "Mango",
    ]);
  });

  it("does not treat an option that merely mentions the phrase as a summary option", () => {
    const labelled = labelChoices([
      { id: "c1", text: "All of the above policies lapse after the grace period" },
      { id: "c2", text: "A real option" },
    ]);

    expect(labelled[0].text).toBe(
      "All of the above policies lapse after the grace period",
    );
  });
});
