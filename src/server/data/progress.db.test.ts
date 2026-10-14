import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/server/db/prisma";
import {
  createFlashcard,
  createMemorization,
  createUser,
  deleteContent,
  deleteUsers,
} from "@/test/db-fixtures";
import {
  applyStreak,
  choiceBelongsTo,
  clearSession,
  fetchRecent,
  fetchStreaks,
  findFlashcardTrack,
  findMemorizationTrack,
  loadSession,
  recordFlashcardReview,
  recordMemorizationAnswer,
  recordVisit,
  saveSession,
} from "./progress";

const made: string[] = [];
async function user() {
  const created = await createUser();
  made.push(created.id);
  return created;
}

const content = { flashcards: [] as string[], memorization: [] as string[] };

afterAll(async () => {
  await deleteUsers(...made);
  await deleteContent(content);
});

describe("applyStreak", () => {
  it("extends on a right answer, resets on a wrong one, and keeps the best", async () => {
    const me = await user();

    expect(await applyStreak(me.id, "VUL", true)).toEqual({ current: 1, best: 1, isNewBest: true, milestone: null });
    expect(await applyStreak(me.id, "VUL", true)).toEqual({ current: 2, best: 2, isNewBest: true, milestone: null });
    expect(await applyStreak(me.id, "VUL", false)).toEqual({ current: 0, best: 2, isNewBest: false, milestone: null });
    expect(await applyStreak(me.id, "VUL", true)).toEqual({ current: 1, best: 2, isNewBest: false, milestone: null });
  });

  it("starts a track at zero on a wrong first answer", async () => {
    const me = await user();
    expect(await applyStreak(me.id, "IIAP_A", false)).toEqual({ current: 0, best: 0, isNewBest: false, milestone: null });
  });

  it("lands on a milestone", async () => {
    const me = await user();
    let last;
    for (let i = 0; i < 5; i++) last = await applyStreak(me.id, "VUL", true);
    expect(last).toMatchObject({ current: 5, milestone: 5 });
  });

  it("loses no answer when two arrive at once on a new track", async () => {
    const me = await user();

    await Promise.all([applyStreak(me.id, "VUL", true), applyStreak(me.id, "VUL", true)]);

    const [row] = await fetchStreaks(me.id);
    expect(row).toMatchObject({ current_streak: 2, best_streak: 2 });
  });

  it("is read back as the streaks list shape", async () => {
    const me = await user();
    await applyStreak(me.id, "VUL", true);

    const rows = await fetchStreaks(me.id);

    expect(rows).toEqual([
      { exam_type: "VUL", current_streak: 1, best_streak: 1, last_answer_at: expect.any(String) },
    ]);
    expect(Math.abs(Date.parse(rows[0].last_answer_at!) - Date.now())).toBeLessThan(60_000);
  });
});

describe("recent activity", () => {
  it("bumps a revisited mode to the top and honours the limit", async () => {
    const me = await user();

    await recordVisit(me.id, "VUL", "flashcard");
    await recordVisit(me.id, "VUL", "memorize");
    await recordVisit(me.id, "IIAP_A", "practice");
    await recordVisit(me.id, "VUL", "flashcard");

    const rows = await fetchRecent(me.id, 2);
    expect(rows.map((r) => [r.exam_type, r.mode])).toEqual([
      ["VUL", "flashcard"],
      ["IIAP_A", "practice"],
    ]);
    expect(typeof rows[0].visited_at).toBe("string");
  });
});

describe("saved sessions", () => {
  const saved = { card_order: ["a", "b"], card_index: 1, ratings: { a: true } };

  it("saves, replaces, loads and clears a deck position", async () => {
    const me = await user();
    expect(await loadSession(me.id, "VUL", "flashcard")).toBeNull();

    await saveSession(me.id, "VUL", "flashcard", saved);
    await saveSession(me.id, "VUL", "flashcard", { ...saved, card_index: 2 });
    expect(await loadSession(me.id, "VUL", "flashcard")).toEqual({ ...saved, card_index: 2 });
    expect(await loadSession(me.id, "VUL", "memorize")).toBeNull();

    await clearSession(me.id, "VUL", "flashcard");
    expect(await loadSession(me.id, "VUL", "flashcard")).toBeNull();
  });

  it("moves updated_at on every save, since no trigger does", async () => {
    const me = await user();
    await saveSession(me.id, "VUL", "flashcard", saved);
    const first = await prisma.studySession.findFirstOrThrow({ where: { userId: me.id } });
    await new Promise((resolve) => setTimeout(resolve, 20));

    await saveSession(me.id, "VUL", "flashcard", saved);

    const second = await prisma.studySession.findFirstOrThrow({ where: { userId: me.id } });
    expect(second.updatedAt.getTime()).toBeGreaterThan(first.updatedAt.getTime());
  });

  it("loads junk in a stored row as an empty position", async () => {
    const me = await user();
    await prisma.studySession.create({
      data: { userId: me.id, examType: "VUL", mode: "flashcard", cardOrder: "oops", ratings: [1] },
    });

    expect(await loadSession(me.id, "VUL", "flashcard")).toEqual({
      card_order: [],
      card_index: 0,
      ratings: {},
    });
  });
});

describe("flashcard reviews", () => {
  it("finds a card's track, and nothing for an unknown id", async () => {
    const card = await createFlashcard({ examType: "IIAP_B" });
    content.flashcards.push(card.id);

    expect(await findFlashcardTrack(card.id)).toBe("IIAP_B");
    expect(await findFlashcardTrack("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("keeps a card mastered once it has been", async () => {
    const me = await user();
    const card = await createFlashcard({});
    content.flashcards.push(card.id);

    expect((await recordFlashcardReview(me.id, card.id, false)).mastered).toBe(false);
    const known = await recordFlashcardReview(me.id, card.id, true);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const missed = await recordFlashcardReview(me.id, card.id, false);

    expect(known.mastered).toBe(true);
    expect(missed).toMatchObject({ id: known.id, userId: me.id, flashcardId: card.id, mastered: true });
    expect(missed.reviewedAt.getTime()).toBeGreaterThan(known.reviewedAt.getTime());
  });

  it("records two simultaneous first reviews as one row", async () => {
    const me = await user();
    const card = await createFlashcard({});
    content.flashcards.push(card.id);

    await Promise.all([
      recordFlashcardReview(me.id, card.id, true),
      recordFlashcardReview(me.id, card.id, false),
    ]);

    const rows = await prisma.flashcardProgress.findMany({ where: { userId: me.id } });
    expect(rows).toHaveLength(1);
  });
});

describe("memorization answers", () => {
  it("checks that a choice belongs to the item", async () => {
    const item = await createMemorization({ choices: [{ text: "A", sortOrder: 1 }] });
    const other = await createMemorization({ choices: [{ text: "B", sortOrder: 1 }] });
    content.memorization.push(item.id, other.id);

    expect(await findMemorizationTrack(item.id)).toBe("VUL");
    expect(await choiceBelongsTo(item.choices[0].id, item.id)).toBe(true);
    expect(await choiceBelongsTo(other.choices[0].id, item.id)).toBe(false);
  });

  it("records the last answer but never takes mastery back", async () => {
    const me = await user();
    const item = await createMemorization({
      choices: [
        { text: "Right", isCorrect: true, sortOrder: 1 },
        { text: "Wrong", sortOrder: 2 },
      ],
    });
    content.memorization.push(item.id);
    const right = item.choices.find((c) => c.isCorrect)!.id;
    const wrong = item.choices.find((c) => !c.isCorrect)!.id;

    await recordMemorizationAnswer({ userId: me.id, memorizationId: item.id, selectedChoiceId: right, isCorrect: true, mastered: true });
    const later = await recordMemorizationAnswer({ userId: me.id, memorizationId: item.id, selectedChoiceId: wrong, isCorrect: false, mastered: false });

    expect(later).toMatchObject({ selectedChoiceId: wrong, isCorrect: false, mastered: true });
  });
});
