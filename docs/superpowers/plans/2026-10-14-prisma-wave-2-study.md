# Prisma Wave 2 (Study) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every study query off the `pg` pool: the content lists (flashcards, memorization, questions, glossary), per-item progress, streaks, recent activity and saved study sessions. They move onto two Prisma data modules. Delete the six study routes nothing calls, and flip the connection split to 2 (`pg`) + 3 (Prisma).

**Architecture:** `src/server/data/content.ts` reads study material. `src/server/data/progress.ts` reads and writes what one learner has done. Content reads return the API types that already exist in `src/lib/types` (`Flashcard`, `Question`, `MemorizationQuestion`), because those types *are* the response contract. Progress writes return camelCase records, and the route maps them back to today's snake_case JSON, as in Wave 1. The flashcard list's `LEFT JOIN LATERAL` question match becomes a pure, unit-tested helper. A one-off parity script compares the old SQL with the new module on the local production restore.

**Tech Stack:** Next.js 16 route handlers (`unstable_cache` is kept exactly where it is), Prisma 7.10 (`@/generated/prisma/client`, `@prisma/adapter-pg`), PostgreSQL, Vitest 4 (`unit` and `db` projects).

**Spec:** `docs/superpowers/specs/2026-10-14-prisma-migration-design.md` (read "Wave 0 outcome" and "Wave 1 outcome" first)

## Global Constraints

- **Existing data is never affected.** This wave adds no migration and changes no schema. If a task seems to need one, stop and ask.
- **Never touch the Railway database.** No `prisma db push`, `migrate dev`, `migrate deploy`, `migrate resolve` or `migrate reset` against it. Don't read `.env`. Every DB command uses `.env.local` (local `insure_dev` through `MIGRATE_DATABASE_URL`, test DB `insure` through `TEST_DATABASE_URL`).
- **Response shapes stay byte-for-byte compatible,** key order included. Nelson approved these intended changes, and nothing else may change:
  1. Six routes are deleted: `GET /api/flashcards/[id]`, `GET /api/flashcards/progress`, `GET /api/memorization/[id]`, `POST /api/memorization/[id]/answer`, `GET /api/memorization/progress`, `GET /api/questions/[id]`. Nothing in the frontend calls them. `answer` took `user_id` from the body, so any signed-in user could write anyone's progress. The two `/progress` routes were extra copies of the mastery counts.
  2. `GET /api/glossary` returns `details` again. It was dropped by a later caching commit, so the glossary page's examples and key points have been empty.
  3. `GET /api/glossary` ignores `?q=`. The page searches client-side.
  4. An unknown `exam_type` on `GET /api/flashcards`, `/api/memorization`, `/api/questions` and `/api/glossary` answers 400 `{ "error": "exam_type is invalid" }` instead of a 500. This matches the eligibility routes in Wave 0.
- **Raw SQL stays only in `src/server/data/mastery.ts`.** `content.ts` and `progress.ts` use the Prisma query API only: no `$queryRaw` or `$executeRaw`.
- **`updated_at` triggers exist only on `users` and `user_progress`.** `study_sessions.updated_at` has no trigger; the old code set it to `now()` on every save, so `progress.ts` sets `updatedAt: new Date()` itself. Do not add `@updatedAt` to the schema.
- **Clock:** `now()` in the old SQL becomes `new Date()` (the Wave 1 ruling; sessions are pinned to UTC).
- **Connection budget becomes 2 (`pg`) + 3 (Prisma)** in Task 6, in the same commit as the last study route moves.
- **Legacy `IIAP` rows:** the database enum still has `IIAP`, but the app's `ExamType` has only the four live tracks. Content rows are passed through as they always were, with `exam_type: row.examType as ExamType` and a comment saying why.
- **Commits:** plain messages, sole author Nelson Lago III, **no `Co-Authored-By` or any other trailer.**
- **PR:** `gh pr create --base dev`, never `main`.
- **Next.js 16:** this plan only edits route handler bodies and keeps every `unstable_cache` call as it is. Before touching any other Next API, read `node_modules/next/dist/docs/`.
- **pnpm only.** Unit tests: `pnpm test`. DB tests: `pnpm test:db` (rebuilds the local `insure` test DB from migrations; Nelson has consented to that wipe).

## Review Focus

1. **A flashcard whose front is shared by several questions.** Expected: it gets the choices of the question whose correct choice reads like the card's back. If only one question has that text, it gets that question's choices outright. If nothing matches, it gets `[]`. Pinned in Task 1 (`choicesForCard` unit tests) and by the parity script in Task 3.
2. **Two answers to a brand-new track submitted at once** (double tap, two tabs). Expected: no 500, no lost increment, and the streak reads 2. Pinned in Task 4 (concurrent `applyStreak` test). The same goes for the first review of a card, pinned in Task 5 (concurrent `recordFlashcardReview`).
3. **A wrong answer after mastering.** Expected: `mastered` stays true and `is_correct` records the wrong answer. Pinned in Task 5.
4. **JSON after the move.** Progress responses keep `id, user_id, flashcard_id, reviewed_at, mastered, streak` (flashcards) and `id, user_id, memorization_id, selected_choice_id, is_correct, reviewed_at, mastered, streak` (memorization), in that order. Timestamps are ISO strings. Pinned by route tests in Task 5. The lists are pinned by the parity script.
5. **A saved session row holding junk** (hand-edited or from an old client). Expected: it loads as an empty deck position and never throws. Pinned in Task 4.

Also noted, not tested: the old list queries order by `category`, `text` or `created_at` alone, so rows that tie come back in whatever order Postgres picks. The new queries keep the same single sort key and the same nondeterminism. The parity script compares tied rows by id, not by position.

---

## File Map

| Path | Responsibility |
| ---- | -------------- |
| `src/lib/helper/flashcard-choices.ts` (+ `.test.ts`) | **Create.** Pure: which question's options a flashcard shows |
| `src/server/data/content.ts` | **Create.** Flashcard, question, memorization and glossary reads |
| `src/server/data/content.db.test.ts` | **Create.** Tests the module against the local test DB |
| `src/server/data/progress.ts` | **Create.** Per-item progress writes, streaks, recent activity, saved sessions |
| `src/server/data/progress.db.test.ts` | **Create** |
| `src/test/db-fixtures.ts` | Modify: add content fixtures |
| `src/app/api/flashcards/route.ts`, `questions/route.ts`, `memorization/route.ts`, `glossary/route.ts` | Modify: call `content.ts`, validate `exam_type` |
| `src/app/api/{flashcards,questions,memorization,glossary}/route.test.ts` | **Create.** Pin status codes and what reaches the module |
| `src/app/api/flashcards/[id]/progress/route.ts`, `memorization/[id]/progress/route.ts` (+ `route.test.ts` each) | Modify / **Create.** Call `progress.ts`, pin the JSON |
| `src/lib/helper/study-session-store.ts` | Modify: the DB functions move to `progress.ts`; the handler factory stays |
| `src/app/api/streaks/route.ts`, `recent-activity/route.ts`, `src/app/learningMethods/{flashCard,memorization,practiceExam}/page.tsx` | Modify: import from `progress.ts` |
| `src/app/api/_lib/streak-store.ts`, `recent-activity-store.ts` | **Delete** (no callers left, so no re-export is needed) |
| The six unused routes | **Delete** |
| `scripts/parity/content-parity.ts`, `package.json` | **Create** / Modify: `pnpm parity:content` |
| `src/lib/db.ts`, `src/server/db/prisma.ts`, `src/server/data/users.db.test.ts` | Modify: 2 + 3 split |
| `docs/superpowers/specs/2026-10-14-prisma-migration-design.md` | Add "Wave 2 outcome" |

---

### Task 1: Flashcards and questions read through `content.ts`

**Files:**
- Create: `src/lib/helper/flashcard-choices.ts`, `src/lib/helper/flashcard-choices.test.ts`
- Create: `src/server/data/content.ts`, `src/server/data/content.db.test.ts`
- Modify: `src/test/db-fixtures.ts`
- Modify: `src/app/api/flashcards/route.ts`, `src/app/api/questions/route.ts`
- Create: `src/app/api/flashcards/route.test.ts`, `src/app/api/questions/route.test.ts`

**Interfaces:**
- Produces:
  - `type QuestionForCard = { examType: string; text: string; choices: { id: string; text: string; isCorrect: boolean }[] }`
  - `choicesForCard(card: { examType: string; front: string; back: string }, questions: QuestionForCard[]): FlashcardChoice[]`
  - `type ContentFilter = { examType: ExamType | null; category: string | null }`
  - `listFlashcards(filter: ContentFilter): Promise<Flashcard[]>`
  - `listQuestions(filter: ContentFilter): Promise<Question[]>`. `created_at` is an ISO string.
  - Fixtures: `createQuestion`, `createFlashcard`, `createMemorization`, `deleteContent` (signatures in Step 4).

- [ ] **Step 1: Write the failing unit test for the matcher**

Create `src/lib/helper/flashcard-choices.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { choicesForCard, type QuestionForCard } from "./flashcard-choices";

const q = (
  text: string,
  correct: string,
  examType = "VUL",
  id = text,
): QuestionForCard => ({
  examType,
  text,
  choices: [
    { id: `${id}-a`, text: "wrong", isCorrect: false },
    { id: `${id}-b`, text: correct, isCorrect: true },
  ],
});

const card = (front: string, back: string, examType = "VUL") => ({
  examType,
  front,
  back,
});

describe("choicesForCard", () => {
  it("takes the only question with the card's front, whatever its answer", () => {
    expect(choicesForCard(card("Q1", "anything"), [q("Q1", "A1")])).toEqual([
      { id: "Q1-a", text: "wrong" },
      { id: "Q1-b", text: "A1" },
    ]);
  });

  it("picks, among questions sharing a front, the one whose answer is the back", () => {
    const questions = [q("Same", "First", "VUL", "one"), q("Same", "Second", "VUL", "two")];

    expect(choicesForCard(card("Same", "Second"), questions)).toEqual([
      { id: "two-a", text: "wrong" },
      { id: "two-b", text: "Second" },
    ]);
  });

  it("shows no options when shared fronts all answer something else", () => {
    const questions = [q("Same", "First", "VUL", "one"), q("Same", "Second", "VUL", "two")];

    expect(choicesForCard(card("Same", "Third"), questions)).toEqual([]);
  });

  it("ignores a question on another track", () => {
    expect(choicesForCard(card("Q1", "A1", "VUL"), [q("Q1", "A1", "IIAP_A")])).toEqual([]);
  });

  it("shows no options when no question has the front", () => {
    expect(choicesForCard(card("Lonely", "A"), [q("Q1", "A1")])).toEqual([]);
  });

  it("does not treat a wrong option equal to the back as the answer", () => {
    const questions: QuestionForCard[] = [
      q("Same", "First", "VUL", "one"),
      {
        examType: "VUL",
        text: "Same",
        choices: [{ id: "x", text: "Back", isCorrect: false }],
      },
    ];

    expect(choicesForCard(card("Same", "Back"), questions)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm test src/lib/helper/flashcard-choices.test.ts`
Expected: FAIL, because `./flashcard-choices` can't be resolved.

- [ ] **Step 3: Write the matcher**

Create `src/lib/helper/flashcard-choices.ts`:

```ts
import type { FlashcardChoice } from "@/lib/types/flashcard";

export type QuestionForCard = {
  examType: string;
  text: string;
  choices: { id: string; text: string; isCorrect: boolean }[];
};

/**
 * The options of the exam question a flashcard was drawn from, so a "which
 * of the following" card can be answered before it is flipped.
 *
 * A card links to a question by track and by its front being the question's
 * text. When several questions share that text, the one whose correct option
 * reads exactly like the card's back is the card's; when none does, the card
 * shows no options rather than another question's. `questions` must already
 * hold each question's choices in display (sort_order) order.
 */
export function choicesForCard(
  card: { examType: string; front: string; back: string },
  questions: QuestionForCard[],
): FlashcardChoice[] {
  const candidates = questions.filter(
    (q) => q.examType === card.examType && q.text === card.front,
  );
  const source =
    candidates.length === 1
      ? candidates[0]
      : candidates.find((q) =>
          q.choices.some((c) => c.isCorrect && c.text === card.back),
        );
  return source?.choices.map(({ id, text }) => ({ id, text })) ?? [];
}
```

- [ ] **Step 4: Run it and confirm it passes**

Run: `pnpm test src/lib/helper/flashcard-choices.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Add content fixtures**

Append to `src/test/db-fixtures.ts` (it already imports `prisma` and defines `uniqueSuffix`):

```ts
type Track = "VUL" | "TRADITIONAL_LIFE" | "IIAP_A" | "IIAP_B";
type ChoiceInput = { text: string; isCorrect?: boolean; sortOrder: number };

export async function createQuestion(input: {
  examType?: Track;
  text?: string;
  category?: string;
  createdAt?: Date;
  choices?: ChoiceInput[];
}) {
  return prisma.question.create({
    data: {
      examType: input.examType ?? "VUL",
      text: input.text ?? `Question ${uniqueSuffix()}`,
      category: input.category ?? "Test",
      createdAt: input.createdAt,
      choices: { create: input.choices ?? [] },
    },
    select: { id: true },
  });
}

export async function createFlashcard(input: {
  examType?: Track;
  front?: string;
  back?: string;
  category?: string;
}) {
  return prisma.flashcard.create({
    data: {
      examType: input.examType ?? "VUL",
      front: input.front ?? `Front ${uniqueSuffix()}`,
      back: input.back ?? "Back",
      category: input.category ?? "Test",
    },
    select: { id: true },
  });
}

export async function createMemorization(input: {
  examType?: Track;
  text?: string;
  category?: string;
  choices?: ChoiceInput[];
}) {
  return prisma.memorization.create({
    data: {
      examType: input.examType ?? "VUL",
      text: input.text ?? `Item ${uniqueSuffix()}`,
      category: input.category ?? "Test",
      choices: { create: input.choices ?? [] },
    },
    select: { id: true, choices: { select: { id: true, isCorrect: true } } },
  });
}

/** Content does not cascade from users, so tests remove what they made. */
export async function deleteContent(ids: {
  flashcards?: string[];
  questions?: string[];
  memorization?: string[];
}) {
  await prisma.flashcard.deleteMany({ where: { id: { in: ids.flashcards ?? [] } } });
  await prisma.question.deleteMany({ where: { id: { in: ids.questions ?? [] } } });
  await prisma.memorization.deleteMany({ where: { id: { in: ids.memorization ?? [] } } });
}
```

- [ ] **Step 6: Write the failing DB tests**

Create `src/server/data/content.db.test.ts`:

```ts
import { afterAll, describe, expect, it } from "vitest";
import {
  createFlashcard,
  createQuestion,
  deleteContent,
  uniqueSuffix,
} from "@/test/db-fixtures";
import { listFlashcards, listQuestions } from "./content";

// Other db test files may leave content of their own in the shared test
// database, so every assertion looks only at the rows this file made.
const made = { flashcards: [] as string[], questions: [] as string[], memorization: [] as string[] };
const mine = <T extends { id: string }>(rows: T[], ids: string[]) =>
  rows.filter((r) => ids.includes(r.id));

afterAll(async () => {
  await deleteContent(made);
});

describe("listFlashcards", () => {
  it("returns cards by category with their question's options in exam order", async () => {
    const front = `Front ${uniqueSuffix()}`;
    const question = await createQuestion({
      text: front,
      choices: [
        { text: "Second", sortOrder: 2 },
        { text: "Right", isCorrect: true, sortOrder: 1 },
      ],
    });
    made.questions.push(question.id);
    const later = await createFlashcard({ front, back: "Right", category: "Zeta" });
    const earlier = await createFlashcard({ category: "Alpha" });
    made.flashcards.push(later.id, earlier.id);

    const rows = mine(await listFlashcards({ examType: "VUL", category: null }), [later.id, earlier.id]);

    expect(rows.map((r) => r.id)).toEqual([earlier.id, later.id]);
    expect(rows[1]).toEqual({
      id: later.id,
      exam_type: "VUL",
      category: "Zeta",
      front,
      back: "Right",
      choices: [
        { id: expect.any(String), text: "Right" },
        { id: expect.any(String), text: "Second" },
      ],
    });
    expect(Object.keys(rows[1])).toEqual(["id", "exam_type", "category", "front", "back", "choices"]);
    expect(rows[0].choices).toEqual([]);
  });

  it("filters by track and category", async () => {
    const category = `Cat ${uniqueSuffix()}`;
    const vul = await createFlashcard({ category });
    const other = await createFlashcard({ category, examType: "IIAP_A" });
    made.flashcards.push(vul.id, other.id);

    expect(mine(await listFlashcards({ examType: "VUL", category }), [vul.id, other.id]).map((r) => r.id)).toEqual([vul.id]);
    expect(mine(await listFlashcards({ examType: null, category }), [vul.id, other.id])).toHaveLength(2);
  });
});

describe("listQuestions", () => {
  it("returns the newest first with every option in exam order", async () => {
    const old = await createQuestion({ createdAt: new Date("2026-01-01T00:00:00Z") });
    const recent = await createQuestion({
      createdAt: new Date("2026-02-01T00:00:00Z"),
      choices: [
        { text: "B", sortOrder: 2 },
        { text: "A", isCorrect: true, sortOrder: 1 },
      ],
    });
    made.questions.push(old.id, recent.id);

    const rows = mine(await listQuestions({ examType: "VUL", category: null }), [old.id, recent.id]);

    expect(rows.map((r) => r.id)).toEqual([recent.id, old.id]);
    expect(rows[0]).toEqual({
      id: recent.id,
      exam_type: "VUL",
      category: "Test",
      text: expect.any(String),
      explanation: null,
      difficulty: 1,
      created_at: "2026-02-01T00:00:00.000Z",
      choices: [
        { id: expect.any(String), text: "A", is_correct: true },
        { id: expect.any(String), text: "B", is_correct: false },
      ],
    });
    expect(Object.keys(rows[0])).toEqual([
      "id", "exam_type", "category", "text", "explanation", "difficulty", "created_at", "choices",
    ]);
    expect(rows[1].choices).toEqual([]);
  });
});
```

- [ ] **Step 7: Run them and confirm they fail**

Run: `pnpm test:db src/server/data/content.db.test.ts`
Expected: FAIL, because `./content` can't be resolved.

- [ ] **Step 8: Write the module**

Create `src/server/data/content.ts`:

```ts
import "server-only";
import prisma from "@/server/db/prisma";
import { choicesForCard } from "@/lib/helper/flashcard-choices";
import type { ExamType } from "@/lib/types/common";
import type { Flashcard } from "@/lib/types/flashcard";
import type { Question } from "@/lib/types/questions";

/**
 * Study material: flashcards, memorization items, practice questions and the
 * glossary. Reads return the API's own shapes from src/lib/types, which are
 * the response contract, so routes pass them straight through.
 *
 * Rows on the legacy IIAP track still exist and have always been returned
 * when no track is asked for, so exam_type is cast rather than filtered.
 */

export type ContentFilter = {
  examType: ExamType | null;
  category: string | null;
};

const whereOf = ({ examType, category }: ContentFilter) => ({
  examType: examType ?? undefined,
  category: category || undefined,
});

/** Flashcards by category, each with the options of the question behind it. */
export async function listFlashcards(filter: ContentFilter): Promise<Flashcard[]> {
  const cards = await prisma.flashcard.findMany({
    where: whereOf(filter),
    orderBy: { category: "asc" },
    select: { id: true, examType: true, category: true, front: true, back: true },
  });
  if (cards.length === 0) return [];

  const questions = await prisma.question.findMany({
    where: {
      examType: { in: [...new Set(cards.map((c) => c.examType))] },
      text: { in: [...new Set(cards.map((c) => c.front))] },
    },
    select: {
      examType: true,
      text: true,
      choices: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, text: true, isCorrect: true },
      },
    },
  });

  return cards.map((card) => ({
    id: card.id,
    exam_type: card.examType as ExamType,
    category: card.category,
    front: card.front,
    back: card.back,
    choices: choicesForCard(card, questions),
  }));
}

/** Practice questions, newest first, with their options in exam order. */
export async function listQuestions(filter: ContentFilter): Promise<Question[]> {
  const rows = await prisma.question.findMany({
    where: whereOf(filter),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      examType: true,
      category: true,
      text: true,
      explanation: true,
      difficulty: true,
      createdAt: true,
      choices: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, text: true, isCorrect: true },
      },
    },
  });

  return rows.map((q) => ({
    id: q.id,
    exam_type: q.examType as ExamType,
    category: q.category,
    text: q.text,
    explanation: q.explanation,
    difficulty: q.difficulty as number,
    created_at: q.createdAt.toISOString(),
    choices: q.choices.map((c) => ({ id: c.id, text: c.text, is_correct: c.isCorrect })),
  }));
}
```

- [ ] **Step 9: Run them and confirm they pass**

Run: `pnpm test:db src/server/data/content.db.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 10: Write the failing route tests**

Create `src/app/api/flashcards/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, listFlashcards } = vi.hoisted(() => ({
  auth: vi.fn(),
  listFlashcards: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/content", () => ({ listFlashcards }));
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import { GET } from "./route";

const get = (query = "") =>
  GET(new Request(`http://internal.local/api/flashcards${query}`));

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  listFlashcards.mockResolvedValue([{ id: "f1" }]);
});

describe("GET /api/flashcards", () => {
  it("answers 401 without a session", async () => {
    auth.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
  });

  it("answers 400 for an unknown track without querying", async () => {
    const response = await get("?exam_type=FOO");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "exam_type is invalid" });
    expect(listFlashcards).not.toHaveBeenCalled();
  });

  it("passes the track and category through and returns the rows", async () => {
    const response = await get("?exam_type=VUL&category=Basics");
    expect(await response.json()).toEqual([{ id: "f1" }]);
    expect(listFlashcards).toHaveBeenCalledWith({ examType: "VUL", category: "Basics" });
  });

  it("lists every track when none is asked for", async () => {
    await get();
    expect(listFlashcards).toHaveBeenCalledWith({ examType: null, category: null });
  });
});
```

Create `src/app/api/questions/route.test.ts` with the same content, except: replace `listFlashcards` with `listQuestions` throughout, and use `/api/questions` in the URL and `describe("GET /api/questions", ...)`.

Run: `pnpm test src/app/api/flashcards/route.test.ts src/app/api/questions/route.test.ts`
Expected: FAIL. The routes still use `pool` and don't validate `exam_type`.

- [ ] **Step 11: Rewire `flashcards/route.ts`**

Replace the whole file with:

```ts
import { auth } from "@/lib/auth";
import { isExamType, type ExamType } from "@/lib/types/common";
import { listFlashcards } from "@/server/data/content";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

const getFlashcards = unstable_cache(
  async (examType: ExamType | null, category: string | null) =>
    listFlashcards({ examType, category }),
  ["flashcards"],
  { tags: ["flashcards"] },
);

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const examType = searchParams.get("exam_type") || null;
  const category = searchParams.get("category");

  if (examType !== null && !isExamType(examType)) {
    return NextResponse.json({ error: "exam_type is invalid" }, { status: 400 });
  }

  try {
    const rows = await getFlashcards(examType, category);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching flashcards:", error);

    return NextResponse.json(
      { error: "Failed to fetch flashcards" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 12: Rewire `questions/route.ts`**

Replace the whole file with:

```ts
import { auth } from "@/lib/auth";
import { isExamType, type ExamType } from "@/lib/types/common";
import { listQuestions } from "@/server/data/content";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

const getQuestions = unstable_cache(
  async (examType: ExamType | null, category: string | null) =>
    listQuestions({ examType, category }),
  ["questions"],
  { tags: ["questions"] },
);

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const examType = searchParams.get("exam_type") || null;
  const category = searchParams.get("category");

  if (examType !== null && !isExamType(examType)) {
    return NextResponse.json({ error: "exam_type is invalid" }, { status: 400 });
  }

  try {
    const rows = await getQuestions(examType, category);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 },
    );
  }
}
```

(The old catch logged nothing. Logging the error is the only difference, and it doesn't change the response.)

- [ ] **Step 13: Route tests, typecheck, lint, unit tests**

Run: `pnpm test src/app/api/flashcards/route.test.ts src/app/api/questions/route.test.ts` → PASS, 4 + 4.
Then `pnpm typecheck` → exit 0. `pnpm lint` → 0 errors (existing warnings are expected). `pnpm test` → all pass.

- [ ] **Step 14: Commit**

```bash
git add src/lib/helper/flashcard-choices.ts src/lib/helper/flashcard-choices.test.ts src/server/data/content.ts src/server/data/content.db.test.ts src/test/db-fixtures.ts src/app/api/flashcards/route.ts src/app/api/flashcards/route.test.ts src/app/api/questions/route.ts src/app/api/questions/route.test.ts
git commit -m "refactor: read flashcards and questions through the content module"
```

---

### Task 2: Memorization list and glossary

**Files:**
- Modify: `src/server/data/content.ts` (append), `src/server/data/content.db.test.ts` (append; extend imports)
- Modify: `src/app/api/memorization/route.ts`, `src/app/api/glossary/route.ts`
- Create: `src/app/api/memorization/route.test.ts`, `src/app/api/glossary/route.test.ts`

**Interfaces:**
- Consumes: `ContentFilter`, `whereOf` (Task 1, same file); `createMemorization`, `createUser`, `deleteUsers` fixtures.
- Produces:
  - `listMemorization(userId: string, filter: ContentFilter): Promise<MemorizationQuestion[]>`
  - `type GlossaryRow = { id: string; exam_type: ExamType; term: string; definition: string; details: unknown }`
  - `listGlossary(examType: ExamType | null): Promise<GlossaryRow[]>`

- [ ] **Step 1: Write the failing DB tests**

In `content.db.test.ts`, add `createMemorization, createUser, deleteUsers` to the fixtures import and `listGlossary, listMemorization` to the `./content` import. Add `import prisma from "@/server/db/prisma";`. Change the `afterAll` to:

```ts
const users: string[] = [];
const terms: string[] = [];

afterAll(async () => {
  await deleteUsers(...users);
  await deleteContent(made);
  await prisma.vocabularyTerm.deleteMany({ where: { id: { in: terms } } });
});
```

Append:

```ts
describe("listMemorization", () => {
  it("returns items by text with this learner's last answer only", async () => {
    const me = await createUser();
    const someoneElse = await createUser();
    users.push(me.id, someoneElse.id);
    const b = await createMemorization({
      text: `B ${uniqueSuffix()}`,
      choices: [
        { text: "No", sortOrder: 2 },
        { text: "Yes", isCorrect: true, sortOrder: 1 },
      ],
    });
    const a = await createMemorization({ text: `A ${uniqueSuffix()}` });
    made.memorization.push(a.id, b.id);
    const yes = b.choices.find((c) => c.isCorrect)!.id;
    await prisma.memorizationProgress.create({
      data: { userId: me.id, memorizationId: b.id, selectedChoiceId: yes, isCorrect: true },
    });
    await prisma.memorizationProgress.create({
      data: { userId: someoneElse.id, memorizationId: a.id, selectedChoiceId: null },
    });

    const rows = mine(await listMemorization(me.id, { examType: "VUL", category: null }), [a.id, b.id]);

    expect(rows.map((r) => r.id)).toEqual([a.id, b.id]);
    expect(rows[0].answered_choice_id).toBeNull();
    expect(rows[1]).toEqual({
      id: b.id,
      exam_type: "VUL",
      category: "Test",
      text: expect.stringMatching(/^B /),
      answered_choice_id: yes,
      choices: [
        { id: yes, text: "Yes", is_correct: true },
        { id: expect.any(String), text: "No", is_correct: false },
      ],
    });
    expect(Object.keys(rows[1])).toEqual([
      "id", "exam_type", "category", "text", "answered_choice_id", "choices",
    ]);
  });
});

describe("listGlossary", () => {
  it("returns terms alphabetically with their details", async () => {
    const suffix = uniqueSuffix();
    const details = { examples: [{ text: "An example" }] };
    const later = await prisma.vocabularyTerm.create({
      data: { examType: "VUL", term: `zz ${suffix}`, definition: "Later", details },
      select: { id: true },
    });
    const earlier = await prisma.vocabularyTerm.create({
      data: { examType: "VUL", term: `aa ${suffix}`, definition: "Earlier" },
      select: { id: true },
    });
    const elsewhere = await prisma.vocabularyTerm.create({
      data: { examType: "IIAP_A", term: `mm ${suffix}`, definition: "Other track" },
      select: { id: true },
    });
    terms.push(later.id, earlier.id, elsewhere.id);
    const ids = terms.slice(-3);

    const vul = mine(await listGlossary("VUL"), ids);

    expect(vul.map((r) => r.id)).toEqual([earlier.id, later.id]);
    expect(vul[1]).toEqual({
      id: later.id,
      exam_type: "VUL",
      term: `zz ${suffix}`,
      definition: "Later",
      details,
    });
    expect(Object.keys(vul[1])).toEqual(["id", "exam_type", "term", "definition", "details"]);
    expect(vul[0].details).toBeNull();
    expect(mine(await listGlossary(null), ids)).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm test:db src/server/data/content.db.test.ts`
Expected: FAIL, because `listMemorization` / `listGlossary` aren't exported.

- [ ] **Step 3: Append to `content.ts`**

Add `import type { MemorizationQuestion } from "@/lib/types/memo";` to the imports, then append:

```ts
/**
 * Memorization items by text, each with this learner's last answer, so a
 * resumed sitting redraws an answered item instead of asking it again.
 */
export async function listMemorization(
  userId: string,
  filter: ContentFilter,
): Promise<MemorizationQuestion[]> {
  const rows = await prisma.memorization.findMany({
    where: whereOf(filter),
    orderBy: { text: "asc" },
    select: {
      id: true,
      examType: true,
      category: true,
      text: true,
      choices: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, text: true, isCorrect: true },
      },
      // (user_id, memorization_id) is unique, so this is at most one row.
      progress: { where: { userId }, select: { selectedChoiceId: true } },
    },
  });

  return rows.map((m) => ({
    id: m.id,
    exam_type: m.examType as ExamType,
    category: m.category,
    text: m.text,
    answered_choice_id: m.progress[0]?.selectedChoiceId ?? null,
    choices: m.choices.map((c) => ({ id: c.id, text: c.text, is_correct: c.isCorrect })),
  }));
}

export type GlossaryRow = {
  id: string;
  exam_type: ExamType;
  term: string;
  definition: string;
  /** jsonb as stored; the glossary page validates it (normalizeDetails). */
  details: unknown;
};

/** Every glossary term, alphabetically, optionally for one track. */
export async function listGlossary(examType: ExamType | null): Promise<GlossaryRow[]> {
  const rows = await prisma.vocabularyTerm.findMany({
    where: { examType: examType ?? undefined },
    orderBy: { term: "asc" },
    select: { id: true, examType: true, term: true, definition: true, details: true },
  });

  return rows.map((t) => ({
    id: t.id,
    exam_type: t.examType as ExamType,
    term: t.term,
    definition: t.definition,
    details: t.details,
  }));
}
```

- [ ] **Step 4: Run them and confirm they pass**

Run: `pnpm test:db src/server/data/content.db.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Write the failing route tests**

Create `src/app/api/memorization/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, listMemorization } = vi.hoisted(() => ({
  auth: vi.fn(),
  listMemorization: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/content", () => ({ listMemorization }));

import { GET } from "./route";

const get = (query = "") =>
  GET(new Request(`http://internal.local/api/memorization${query}`));

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  listMemorization.mockResolvedValue([{ id: "m1" }]);
});

describe("GET /api/memorization", () => {
  it("answers 401 without a session", async () => {
    auth.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
  });

  it("answers 400 for an unknown track without querying", async () => {
    const response = await get("?exam_type=FOO");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "exam_type is invalid" });
    expect(listMemorization).not.toHaveBeenCalled();
  });

  it("reads the signed-in learner's items", async () => {
    const response = await get("?exam_type=VUL&category=Basics");
    expect(await response.json()).toEqual([{ id: "m1" }]);
    expect(listMemorization).toHaveBeenCalledWith("u1", { examType: "VUL", category: "Basics" });
  });
});
```

Create `src/app/api/glossary/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, listGlossary } = vi.hoisted(() => ({
  auth: vi.fn(),
  listGlossary: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/content", () => ({ listGlossary }));
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import { GET } from "./route";

const get = (query = "") =>
  GET(new Request(`http://internal.local/api/glossary${query}`));

const row = {
  id: "t1",
  exam_type: "VUL",
  term: "Assignee",
  definition: "Someone",
  details: { examples: [{ text: "x" }] },
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  listGlossary.mockResolvedValue([row]);
});

describe("GET /api/glossary", () => {
  it("returns every term with its details", async () => {
    expect(await (await get()).json()).toEqual([row]);
    expect(listGlossary).toHaveBeenCalledWith(null);
  });

  it("ignores q: the page searches client-side", async () => {
    await get("?exam_type=VUL&q=trust");
    expect(listGlossary).toHaveBeenCalledWith("VUL");
  });

  it("answers 400 for an unknown track", async () => {
    expect((await get("?exam_type=FOO")).status).toBe(400);
    expect(listGlossary).not.toHaveBeenCalled();
  });
});
```

Run: `pnpm test src/app/api/memorization/route.test.ts src/app/api/glossary/route.test.ts`
Expected: FAIL.

- [ ] **Step 6: Rewire `memorization/route.ts`**

Replace the whole file with:

```ts
import { auth } from "@/lib/auth";
import { isExamType } from "@/lib/types/common";
import { listMemorization } from "@/server/data/content";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const examType = searchParams.get("exam_type") || null;
  const category = searchParams.get("category");

  if (examType !== null && !isExamType(examType)) {
    return NextResponse.json({ error: "exam_type is invalid" }, { status: 400 });
  }

  try {
    // The learner's own last answer rides along with the item, so a resumed
    // sitting can show a question they already answered exactly as they left
    // it rather than blank and answerable a second time.
    return NextResponse.json(
      await listMemorization(session.user.id, { examType, category }),
    );
  } catch (error) {
    console.error("Error fetching memorization:", error);
    return NextResponse.json(
      { error: "Failed to fetch memorization" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 7: Rewire `glossary/route.ts`**

Replace the whole file with:

```ts
import { auth } from "@/lib/auth";
import { isExamType, type ExamType } from "@/lib/types/common";
import { listGlossary } from "@/server/data/content";
import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";

// Search happens on the glossary page, over the whole list, so this route
// only ever filters by track. `details` (examples, key points) is what the
// term cards render beneath the definition.
const getVocabulary = unstable_cache(
  async (examType: ExamType | null) => listGlossary(examType),
  ["vocabulary"],
  { tags: ["vocabulary"] },
);

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const examType = new URL(req.url).searchParams.get("exam_type") || null;

  if (examType !== null && !isExamType(examType)) {
    return NextResponse.json({ error: "exam_type is invalid" }, { status: 400 });
  }

  try {
    return NextResponse.json(await getVocabulary(examType));
  } catch (error) {
    console.error("Error fetching glossary terms:", error);

    return NextResponse.json(
      { error: "Failed to fetch glossary terms" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 8: Route tests, typecheck, lint, unit tests**

Run: `pnpm test src/app/api/memorization/route.test.ts src/app/api/glossary/route.test.ts` → PASS, 3 + 3.
Then `pnpm typecheck`, `pnpm lint`, `pnpm test`: all clean.

- [ ] **Step 9: Commit**

```bash
git add src/server/data/content.ts src/server/data/content.db.test.ts src/app/api/memorization/route.ts src/app/api/memorization/route.test.ts src/app/api/glossary
git commit -m "refactor: read memorization and the glossary through the content module"
```

---

### Task 3: Content parity against the production restore

**Files:**
- Create: `scripts/parity/content-parity.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: `listFlashcards`, `listQuestions`, `listMemorization`, `listGlossary` (Tasks 1–2).
- Produces: `pnpm parity:content`. It exits 1 on any difference.

- [ ] **Step 1: Add the script entry**

In `package.json` `scripts`, after `"parity"`, add:

```json
"parity:content": "tsx --conditions=react-server scripts/parity/content-parity.ts",
```

- [ ] **Step 2: Write the script**

Create `scripts/parity/content-parity.ts`:

```ts
// Compares the pre-Prisma study list SQL with src/server/data/content.ts on
// the local dev copy. Exit code 1 on any difference. Run: pnpm parity:content
//
// The old queries are copied from the routes as they stood before Wave 2
// (commit 513e28d), so this stays a fixed reference after the routes change.
//
// The old queries sort on one key (category, created_at, text, term), and rows
// that tie on it come back in no fixed order, so each list is compared twice:
// the sequence of sort keys, and every row by id.
import { config } from "dotenv";
import { Pool } from "pg";
import { assertLocalDatabase } from "../../src/server/db/local-guard";
import { examTypes } from "../../src/lib/types/common";

config({ path: ".env.local" });
const url = assertLocalDatabase(process.env.MIGRATE_DATABASE_URL);
process.env.DATABASE_URL = url;

const pool = new Pool({ connectionString: url });
const diffs: string[] = [];
type Row = { id: string } & Record<string, unknown>;

// JSON round trip: Dates become the ISO strings the API sends.
const json = (value: unknown) => JSON.parse(JSON.stringify(value));

function compare(label: string, key: string, oldRows: unknown[], newRows: unknown[]) {
  const a = json(oldRows) as Row[];
  const b = json(newRows) as Row[];
  const keys = (rows: Row[]) => JSON.stringify(rows.map((r) => r[key]));
  if (keys(a) !== keys(b)) diffs.push(`${label}: ${key} order differs`);
  const byId = new Map(b.map((r) => [r.id, r]));
  for (const row of a) {
    const other = byId.get(row.id);
    if (JSON.stringify(row) !== JSON.stringify(other)) {
      diffs.push(`${label} ${row.id}\n  old: ${JSON.stringify(row)}\n  new: ${JSON.stringify(other)}`);
    }
  }
  if (a.length !== b.length) diffs.push(`${label}: ${a.length} rows vs ${b.length}`);
}

const OLD_FLASHCARDS = `
  SELECT f.id, f.exam_type, f.category, f.front, f.back,
    COALESCE((SELECT json_agg(json_build_object('id', c.id, 'text', c.text) ORDER BY c.sort_order)
              FROM choices c WHERE c.question_id = q.id), '[]') AS choices
  FROM flashcards f
  LEFT JOIN LATERAL (
    SELECT q.id FROM questions q
    WHERE q.exam_type = f.exam_type AND q.text = f.front
      AND ((SELECT count(*) FROM questions dup
            WHERE dup.exam_type = f.exam_type AND dup.text = f.front) = 1
           OR EXISTS (SELECT 1 FROM choices c
                      WHERE c.question_id = q.id AND c.is_correct AND c.text = f.back))
    LIMIT 1
  ) q ON true
  WHERE ($1::exam_type IS NULL OR f.exam_type = $1)
  ORDER BY f.category ASC`;

const OLD_QUESTIONS = `
  SELECT q.id, q.exam_type, q.category, q.text, q.explanation, q.difficulty, q.created_at,
    COALESCE(json_agg(json_build_object('id', c.id, 'text', c.text, 'is_correct', c.is_correct)
             ORDER BY c.sort_order) FILTER (WHERE c.id IS NOT NULL), '[]') AS choices
  FROM questions q LEFT JOIN choices c ON c.question_id = q.id
  WHERE ($1::exam_type IS NULL OR q.exam_type = $1)
  GROUP BY q.id ORDER BY q.created_at DESC`;

const OLD_MEMORIZATION = `
  SELECT m.id, m.exam_type, m.category, m.text, mp.selected_choice_id AS answered_choice_id,
    COALESCE(json_agg(json_build_object('id', c.id, 'text', c.text, 'is_correct', c.is_correct)
             ORDER BY c.sort_order) FILTER (WHERE c.id IS NOT NULL), '[]') AS choices
  FROM memorization m
  LEFT JOIN memorization_choices c ON c.memorization_id = m.id
  LEFT JOIN memorization_progress mp ON mp.memorization_id = m.id AND mp.user_id = $1
  WHERE ($2::exam_type IS NULL OR m.exam_type = $2)
  GROUP BY m.id, mp.selected_choice_id ORDER BY m.text ASC`;

// The old route did not select details; Wave 2 adds it back on purpose, so
// it is compared on its own against the column.
const OLD_GLOSSARY = `
  SELECT id, exam_type, term, definition FROM vocabulary_terms
  WHERE ($1::exam_type IS NULL OR exam_type = $1) ORDER BY term ASC`;

async function main() {
  const { listFlashcards, listQuestions, listMemorization, listGlossary } =
    await import("../../src/server/data/content");
  const tracks = [null, ...examTypes];

  for (const examType of tracks) {
    const label = examType ?? "all";
    compare(`flashcards ${label}`, "category",
      (await pool.query(OLD_FLASHCARDS, [examType])).rows,
      await listFlashcards({ examType, category: null }));
    compare(`questions ${label}`, "created_at",
      (await pool.query(OLD_QUESTIONS, [examType])).rows,
      await listQuestions({ examType, category: null }));

    const glossary = await listGlossary(examType);
    compare(`glossary ${label}`, "term",
      (await pool.query(OLD_GLOSSARY, [examType])).rows,
      glossary.map((t) => ({ id: t.id, exam_type: t.exam_type, term: t.term, definition: t.definition })));
    const stored = new Map(
      (await pool.query(`SELECT id, details FROM vocabulary_terms`)).rows.map(
        (r) => [r.id as string, JSON.stringify(r.details)],
      ),
    );
    for (const t of glossary) {
      if (stored.get(t.id) !== JSON.stringify(t.details)) {
        diffs.push(`glossary details ${t.id} differ from the column`);
      }
    }
  }

  const users = (await pool.query(`SELECT id::text FROM users`)).rows.map(
    (r) => r.id as string,
  );
  console.log(`Comparing memorization for ${users.length} users…`);
  for (const userId of users) {
    for (const examType of tracks) {
      compare(`memorization ${userId} ${examType ?? "all"}`, "text",
        (await pool.query(OLD_MEMORIZATION, [userId, examType])).rows,
        await listMemorization(userId, { examType, category: null }));
    }
  }

  console.log(diffs.length === 0 ? "parity: 0 differences" : diffs.join("\n"));
  if (diffs.length) process.exitCode = 1;
  console.log(
    "Intended differences, not compared: six unused routes deleted; glossary returns details and ignores q; unknown exam_type answers 400.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    const { default: prisma } = await import("../../src/server/db/prisma");
    await prisma.$disconnect();
  });
```

- [ ] **Step 3: Run it against the local restore**

Run: `pnpm parity:content`
Expected: `parity: 0 differences`, exit 0.

If a list differs, read the diff before changing anything. One expected false alarm: the old flashcard query's `LIMIT 1` picks *any* matching question when several share a front *and* a correct answer equal to the back (true duplicates). If the only differences are cards like that, and the two questions' choices differ only in ids, record it as a ruling and make the comparison skip those card ids, with a comment naming them. Any other difference is a bug in Task 1 or 2: fix it there, not here.

- [ ] **Step 4: Commit**

```bash
git add scripts/parity/content-parity.ts package.json
git commit -m "test: compare the old study list SQL with the content module"
```

---

### Task 4: Streaks, recent activity and saved sessions in `progress.ts`

**Files:**
- Create: `src/server/data/progress.ts`, `src/server/data/progress.db.test.ts`
- Modify: `src/lib/helper/study-session-store.ts`
- Modify: `src/app/api/streaks/route.ts`, `src/app/api/recent-activity/route.ts`, `src/app/learningMethods/flashCard/page.tsx`, `src/app/learningMethods/memorization/page.tsx`, `src/app/learningMethods/practiceExam/page.tsx`, `src/app/api/flashcards/[id]/progress/route.ts`, `src/app/api/memorization/[id]/progress/route.ts` (import line only)
- Delete: `src/app/api/_lib/streak-store.ts`, `src/app/api/_lib/recent-activity-store.ts`

**Interfaces:**
- Produces (signatures unchanged from the stores they replace, so callers change only their import):
  - `applyStreak(userId: string, examType: string, isCorrect: boolean): Promise<StreakResult>`
  - `fetchStreaks(userId: string): Promise<StreakRow[]>`. `last_answer_at` is an ISO string or null.
  - `type RecentActivityRow = { exam_type: ExamType; mode: StudyMode; visited_at: string }`
  - `recordVisit(userId: string, examType: ExamType, mode: StudyMode): Promise<void>`
  - `fetchRecent(userId: string, limit: number): Promise<RecentActivityRow[]>`
  - `loadSession(userId, examType: ExamType, mode: StudyMode): Promise<SavedSession | null>`
  - `saveSession(userId, examType, mode, saved: SavedSession): Promise<void>`
  - `clearSession(userId, examType, mode): Promise<void>`

- [ ] **Step 1: Write the failing DB tests**

Create `src/server/data/progress.db.test.ts`:

```ts
import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/server/db/prisma";
import { createUser, deleteUsers } from "@/test/db-fixtures";
import {
  applyStreak,
  clearSession,
  fetchRecent,
  fetchStreaks,
  loadSession,
  recordVisit,
  saveSession,
} from "./progress";

const made: string[] = [];
async function user() {
  const created = await createUser();
  made.push(created.id);
  return created;
}

afterAll(async () => {
  await deleteUsers(...made);
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
```

(`ratings: [1]` is an array, and `typeof [] === "object"`. The old parse would have returned it as-is. Step 3's parse excludes arrays, so this test pins the stricter reading. An array was never a valid `ratings`, and the client only reads keys from it, so this changes no response a real client gets.)

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm test:db src/server/data/progress.db.test.ts`
Expected: FAIL, because `./progress` can't be resolved.

- [ ] **Step 3: Write the module**

Create `src/server/data/progress.ts`:

```ts
import "server-only";
import prisma from "@/server/db/prisma";
import { nextStreak, streakMilestone } from "@/lib/helper/streaks";
import type { SavedSession } from "@/lib/helper/study-session";
import type { ExamType } from "@/lib/types/common";
import type { StreakResult, StreakRow } from "@/lib/types/streak";
import type { StudyMode } from "@/lib/types/study";

/**
 * What one learner has done: answers on each item, their streak per track,
 * which study modes they opened last, and where they are in a deck. Every
 * query on flashcard_progress, memorization_progress, study_streaks,
 * recent_activity and study_sessions goes through here.
 */

const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 10_000 };

/**
 * Applies one answer to the learner's streak on a track.
 *
 * The increment happens in the upsert itself, so two answers at once both
 * count. The upsert also locks the row until this transaction commits, so
 * the best-streak raise that follows sees the count it just made. The best
 * only ever rises: it is raised conditionally, never set downward.
 */
export async function applyStreak(
  userId: string,
  examType: string,
  isCorrect: boolean,
): Promise<StreakResult> {
  const track = examType as ExamType;
  const key = { userId_examType: { userId, examType: track } };

  const existing = await prisma.studyStreak.findUnique({
    where: key,
    select: { currentStreak: true, bestStreak: true },
  });
  const previous = existing
    ? { current: existing.currentStreak, best: existing.bestStreak }
    : { current: 0, best: 0 };
  const first = nextStreak({ current: 0, best: 0 }, isCorrect);

  const { current, best } = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const row = await tx.studyStreak.upsert({
      where: key,
      create: {
        userId,
        examType: track,
        currentStreak: first.current,
        bestStreak: first.best,
        lastAnswerAt: now,
      },
      update: {
        currentStreak: isCorrect ? { increment: 1 } : 0,
        lastAnswerAt: now,
      },
      select: { currentStreak: true, bestStreak: true },
    });

    if (row.currentStreak > row.bestStreak) {
      await tx.studyStreak.updateMany({
        where: { userId, examType: track, bestStreak: { lt: row.currentStreak } },
        data: { bestStreak: row.currentStreak },
      });
    }
    return {
      current: row.currentStreak,
      best: Math.max(row.bestStreak, row.currentStreak),
    };
  }, TRANSACTION_OPTIONS);

  return {
    current,
    best,
    isNewBest: current === best && current > previous.best,
    milestone: streakMilestone(current),
  };
}

export async function fetchStreaks(userId: string): Promise<StreakRow[]> {
  const rows = await prisma.studyStreak.findMany({
    where: { userId },
    select: { examType: true, currentStreak: true, bestStreak: true, lastAnswerAt: true },
  });

  return rows.map((row) => ({
    exam_type: row.examType as ExamType,
    current_streak: row.currentStreak,
    best_streak: row.bestStreak,
    last_answer_at: row.lastAnswerAt?.toISOString() ?? null,
  }));
}

export type RecentActivityRow = {
  exam_type: ExamType;
  mode: StudyMode;
  visited_at: string;
};

/** Records that a learner just opened a study mode on a track, bumping it to the top of Quick Access. */
export async function recordVisit(
  userId: string,
  examType: ExamType,
  mode: StudyMode,
): Promise<void> {
  const visitedAt = new Date();
  await prisma.recentActivity.upsert({
    where: { userId_examType_mode: { userId, examType, mode } },
    create: { userId, examType, mode, visitedAt },
    update: { visitedAt },
  });
}

export async function fetchRecent(
  userId: string,
  limit: number,
): Promise<RecentActivityRow[]> {
  const rows = await prisma.recentActivity.findMany({
    where: { userId },
    orderBy: { visitedAt: "desc" },
    take: limit,
    select: { examType: true, mode: true, visitedAt: true },
  });

  return rows.map((row) => ({
    exam_type: row.examType as ExamType,
    mode: row.mode as StudyMode,
    visited_at: row.visitedAt.toISOString(),
  }));
}

const sessionKey = (userId: string, examType: ExamType, mode: StudyMode) => ({
  userId_examType_mode: { userId, examType, mode },
});

const isPlainObject = (value: unknown): value is Record<string, boolean> =>
  !!value && typeof value === "object" && !Array.isArray(value);

/**
 * Persisted deck position for one learner, track and study mode. The columns
 * are jsonb, so a row is read defensively: anything that is not the shape we
 * write loads as an empty position rather than breaking the deck.
 */
export async function loadSession(
  userId: string,
  examType: ExamType,
  mode: StudyMode,
): Promise<SavedSession | null> {
  const row = await prisma.studySession.findUnique({
    where: sessionKey(userId, examType, mode),
    select: { cardOrder: true, cardIndex: true, ratings: true },
  });
  if (!row) return null;

  return {
    card_order: Array.isArray(row.cardOrder) ? (row.cardOrder as string[]) : [],
    card_index: Number(row.cardIndex) || 0,
    ratings: isPlainObject(row.ratings) ? row.ratings : {},
  };
}

/** Replaces the saved position. study_sessions has no updated_at trigger. */
export async function saveSession(
  userId: string,
  examType: ExamType,
  mode: StudyMode,
  saved: SavedSession,
): Promise<void> {
  const data = {
    cardOrder: saved.card_order,
    cardIndex: saved.card_index,
    ratings: saved.ratings,
    updatedAt: new Date(),
  };
  await prisma.studySession.upsert({
    where: sessionKey(userId, examType, mode),
    create: { userId, examType, mode, ...data },
    update: data,
  });
}

export async function clearSession(
  userId: string,
  examType: ExamType,
  mode: StudyMode,
): Promise<void> {
  await prisma.studySession.deleteMany({ where: { userId, examType, mode } });
}
```

- [ ] **Step 4: Run them and confirm they pass**

Run: `pnpm test:db src/server/data/progress.db.test.ts`
Expected: PASS, 10 tests.

If the concurrent streak test fails with a unique-constraint error (P2002), Prisma didn't run this upsert as a native `INSERT ... ON CONFLICT`. Print the error's `code` and `meta`. Then wrap only the `prisma.$transaction(...)` call in a single retry on `P2002`: the second attempt finds the row and takes the update path. Record that as a ruling. Don't widen the retry to other errors.

- [ ] **Step 5: Point the stores' callers at `progress.ts`**

In `src/lib/helper/study-session-store.ts`:
- Replace `import pool from "@/lib/db";` with `import { clearSession, loadSession, saveSession } from "@/server/data/progress";`.
- Delete the local `loadSession`, `saveSession` and `clearSession` functions (old lines 21–78). The handlers keep calling them by the same names.
- Replace the first paragraph of the opening doc comment:
  ```ts
   * Persisted deck position for one learner, track and study mode. One row per
   * combination, replaced on every answer, deleted when the deck is finished or
   * restarted.
  ```
  with:
  ```ts
   * The saved-session routes. The deck position itself lives in
   * src/server/data/progress.ts: one row per learner, track and study mode,
   * replaced on every answer, deleted when the deck is finished or restarted.
  ```

Change only the import line in each of these:
- `src/app/api/streaks/route.ts`: `import { fetchStreaks } from "@/server/data/progress";`
- `src/app/api/recent-activity/route.ts`: `import { fetchRecent } from "@/server/data/progress";`
- `src/app/learningMethods/flashCard/page.tsx`, `memorization/page.tsx`, `practiceExam/page.tsx`: `import { recordVisit } from "@/server/data/progress";`
- `src/app/api/flashcards/[id]/progress/route.ts`, `src/app/api/memorization/[id]/progress/route.ts`: `import { applyStreak } from "@/server/data/progress";`

Then delete the two stores:

```bash
git rm src/app/api/_lib/streak-store.ts src/app/api/_lib/recent-activity-store.ts
```

Confirm that nothing still imports them. Run `git grep -nE "streak-store|recent-activity-store" -- src`; it should print nothing.

- [ ] **Step 6: Typecheck, lint, unit tests**

Run: `pnpm typecheck`, `pnpm lint`, `pnpm test`: all clean. `src/lib/helper/study-session.test.ts` must still pass unchanged.

- [ ] **Step 7: Commit**

```bash
git add -A src/server/data/progress.ts src/server/data/progress.db.test.ts src/lib/helper/study-session-store.ts src/app/api/streaks src/app/api/recent-activity src/app/api/_lib src/app/learningMethods "src/app/api/flashcards/[id]/progress/route.ts" "src/app/api/memorization/[id]/progress/route.ts"
git commit -m "refactor: keep streaks, recent activity and saved decks in the progress module"
```

---

### Task 5: Per-item progress writes

**Files:**
- Modify: `src/server/data/progress.ts` (append), `src/server/data/progress.db.test.ts` (append; extend imports)
- Modify: `src/app/api/flashcards/[id]/progress/route.ts`, `src/app/api/memorization/[id]/progress/route.ts`
- Create: `src/app/api/flashcards/[id]/progress/route.test.ts`, `src/app/api/memorization/[id]/progress/route.test.ts`

**Interfaces:**
- Consumes: `applyStreak` (Task 4); fixtures `createFlashcard`, `createMemorization`, `deleteContent` (Task 1).
- Produces:
  - `findFlashcardTrack(flashcardId: string): Promise<ExamType | null>`
  - `type FlashcardReview = { id: string; userId: string; flashcardId: string; reviewedAt: Date; mastered: boolean }`
  - `recordFlashcardReview(userId: string, flashcardId: string, mastered: boolean): Promise<FlashcardReview>`. Mastery is sticky.
  - `findMemorizationTrack(memorizationId: string): Promise<ExamType | null>`
  - `choiceBelongsTo(choiceId: string, memorizationId: string): Promise<boolean>`
  - `type MemorizationAnswer = { id: string; userId: string; memorizationId: string; selectedChoiceId: string | null; isCorrect: boolean | null; reviewedAt: Date; mastered: boolean }`
  - `recordMemorizationAnswer(input: { userId: string; memorizationId: string; selectedChoiceId: string; isCorrect: boolean; mastered: boolean }): Promise<MemorizationAnswer>`. Mastery is sticky; `isCorrect` and the choice record the last answer.

- [ ] **Step 1: Write the failing DB tests**

In `progress.db.test.ts`, add `choiceBelongsTo, findFlashcardTrack, findMemorizationTrack, recordFlashcardReview, recordMemorizationAnswer` to the `./progress` import. Extend the fixtures import with `createFlashcard, createMemorization, deleteContent`. Add above `afterAll`:

```ts
const content = { flashcards: [] as string[], memorization: [] as string[] };
```

and make `afterAll` also run `await deleteContent(content);` after `deleteUsers`. Then append:

```ts
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
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `pnpm test:db src/server/data/progress.db.test.ts`
Expected: FAIL, because the five functions aren't exported.

- [ ] **Step 3: Append to `progress.ts`**

```ts
/** The track a flashcard belongs to; null if there is no such card. */
export async function findFlashcardTrack(flashcardId: string): Promise<ExamType | null> {
  const card = await prisma.flashcard.findUnique({
    where: { id: flashcardId },
    select: { examType: true },
  });
  return (card?.examType as ExamType | undefined) ?? null;
}

export type FlashcardReview = {
  id: string;
  userId: string;
  flashcardId: string;
  reviewedAt: Date;
  mastered: boolean;
};

/**
 * "A card counts as mastered once you have" — the About page's words. A
 * card known in one pass and missed in the next stays mastered, so repeated
 * runs add to the tally instead of trading one card for another.
 */
export async function recordFlashcardReview(
  userId: string,
  flashcardId: string,
  mastered: boolean,
): Promise<FlashcardReview> {
  const reviewedAt = new Date();
  return prisma.flashcardProgress.upsert({
    where: { userId_flashcardId: { userId, flashcardId } },
    create: { userId, flashcardId, reviewedAt, mastered },
    update: mastered ? { reviewedAt, mastered: true } : { reviewedAt },
    select: { id: true, userId: true, flashcardId: true, reviewedAt: true, mastered: true },
  });
}

/** The track a memorization item belongs to; null if there is no such item. */
export async function findMemorizationTrack(
  memorizationId: string,
): Promise<ExamType | null> {
  const item = await prisma.memorization.findUnique({
    where: { id: memorizationId },
    select: { examType: true },
  });
  return (item?.examType as ExamType | undefined) ?? null;
}

/** Whether the choice is one of this item's options. */
export async function choiceBelongsTo(
  choiceId: string,
  memorizationId: string,
): Promise<boolean> {
  return (
    (await prisma.memorizationChoice.count({
      where: { id: choiceId, memorizationId },
    })) > 0
  );
}

export type MemorizationAnswer = {
  id: string;
  userId: string;
  memorizationId: string;
  selectedChoiceId: string | null;
  isCorrect: boolean | null;
  reviewedAt: Date;
  mastered: boolean;
};

/**
 * Records the learner's latest answer. Mastery only ever goes up: an item
 * mastered once stays mastered even if a later pass gets it wrong, while
 * isCorrect and the selected choice always describe the last answer.
 */
export async function recordMemorizationAnswer(input: {
  userId: string;
  memorizationId: string;
  selectedChoiceId: string;
  isCorrect: boolean;
  mastered: boolean;
}): Promise<MemorizationAnswer> {
  const { userId, memorizationId, selectedChoiceId, isCorrect, mastered } = input;
  const reviewedAt = new Date();
  const answer = { selectedChoiceId, isCorrect, reviewedAt };
  return prisma.memorizationProgress.upsert({
    where: { userId_memorizationId: { userId, memorizationId } },
    create: { userId, memorizationId, ...answer, mastered },
    update: mastered ? { ...answer, mastered: true } : answer,
    select: {
      id: true,
      userId: true,
      memorizationId: true,
      selectedChoiceId: true,
      isCorrect: true,
      reviewedAt: true,
      mastered: true,
    },
  });
}
```

- [ ] **Step 4: Run them and confirm they pass**

Run: `pnpm test:db src/server/data/progress.db.test.ts`
Expected: PASS, 15 tests. (The P2002 note from Task 4 Step 4 applies to the concurrent review test as well. If that test fails the same way, use the same narrow retry.)

- [ ] **Step 5: Write the failing route tests**

Create `src/app/api/flashcards/[id]/progress/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, findFlashcardTrack, recordFlashcardReview, applyStreak } =
  vi.hoisted(() => ({
    auth: vi.fn(),
    findFlashcardTrack: vi.fn(),
    recordFlashcardReview: vi.fn(),
    applyStreak: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/progress", () => ({
  findFlashcardTrack,
  recordFlashcardReview,
  applyStreak,
}));

import { POST } from "./route";

const streak = { current: 3, best: 3, isNewBest: true, milestone: null };
const post = (body: unknown) =>
  POST(
    new Request("http://internal.local/api/flashcards/f1/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "f1" }) },
  );

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  findFlashcardTrack.mockResolvedValue("VUL");
  recordFlashcardReview.mockResolvedValue({
    id: "p1",
    userId: "u1",
    flashcardId: "f1",
    reviewedAt: new Date("2026-10-14T09:00:00.000Z"),
    mastered: true,
  });
  applyStreak.mockResolvedValue(streak);
});

describe("POST /api/flashcards/[id]/progress", () => {
  it("answers with the saved review in today's snake_case shape", async () => {
    const response = await post({ mastered: true });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(
      JSON.stringify({
        id: "p1",
        user_id: "u1",
        flashcard_id: "f1",
        reviewed_at: "2026-10-14T09:00:00.000Z",
        mastered: true,
        streak,
      }),
    );
    expect(recordFlashcardReview).toHaveBeenCalledWith("u1", "f1", true);
    expect(applyStreak).toHaveBeenCalledWith("u1", "VUL", true);
  });

  it("answers 400 without a boolean mastered", async () => {
    expect((await post({ mastered: "yes" })).status).toBe(400);
    expect(recordFlashcardReview).not.toHaveBeenCalled();
  });

  it("answers 404 for an unknown card", async () => {
    findFlashcardTrack.mockResolvedValue(null);
    const response = await post({ mastered: true });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Flashcard not found" });
  });
});
```

Create `src/app/api/memorization/[id]/progress/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, findMemorizationTrack, choiceBelongsTo, recordMemorizationAnswer, applyStreak } =
  vi.hoisted(() => ({
    auth: vi.fn(),
    findMemorizationTrack: vi.fn(),
    choiceBelongsTo: vi.fn(),
    recordMemorizationAnswer: vi.fn(),
    applyStreak: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/progress", () => ({
  findMemorizationTrack,
  choiceBelongsTo,
  recordMemorizationAnswer,
  applyStreak,
}));

import { POST } from "./route";

const streak = { current: 0, best: 4, isNewBest: false, milestone: null };
const body = { selected_choice_id: "c1", is_correct: false, mastered: false };
const post = (payload: unknown = body) =>
  POST(
    new Request("http://internal.local/api/memorization/m1/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
    { params: Promise.resolve({ id: "m1" }) },
  );

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  findMemorizationTrack.mockResolvedValue("IIAP_A");
  choiceBelongsTo.mockResolvedValue(true);
  recordMemorizationAnswer.mockResolvedValue({
    id: "p1",
    userId: "u1",
    memorizationId: "m1",
    selectedChoiceId: "c1",
    isCorrect: false,
    reviewedAt: new Date("2026-10-14T09:00:00.000Z"),
    mastered: true,
  });
  applyStreak.mockResolvedValue(streak);
});

describe("POST /api/memorization/[id]/progress", () => {
  it("answers with the saved answer in today's snake_case shape", async () => {
    const response = await post();

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(
      JSON.stringify({
        id: "p1",
        user_id: "u1",
        memorization_id: "m1",
        selected_choice_id: "c1",
        is_correct: false,
        reviewed_at: "2026-10-14T09:00:00.000Z",
        mastered: true,
        streak,
      }),
    );
    expect(recordMemorizationAnswer).toHaveBeenCalledWith({
      userId: "u1",
      memorizationId: "m1",
      selectedChoiceId: "c1",
      isCorrect: false,
      mastered: false,
    });
    expect(applyStreak).toHaveBeenCalledWith("u1", "IIAP_A", false);
  });

  it("answers 400 when a field is missing", async () => {
    expect((await post({ selected_choice_id: "c1", is_correct: true })).status).toBe(400);
  });

  it("answers 404 for an unknown item", async () => {
    findMemorizationTrack.mockResolvedValue(null);
    const response = await post();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Memorization item not found" });
  });

  it("answers 404 for another item's choice", async () => {
    choiceBelongsTo.mockResolvedValue(false);
    const response = await post();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Choice not found for this memorization item" });
    expect(recordMemorizationAnswer).not.toHaveBeenCalled();
  });
});
```

Run: `pnpm test "src/app/api/flashcards/\[id\]/progress" "src/app/api/memorization/\[id\]/progress"`
Expected: FAIL. The routes still call `pool`.

- [ ] **Step 6: Rewire `flashcards/[id]/progress/route.ts`**

Replace the imports with:

```ts
import { auth } from "@/lib/auth";
import {
  applyStreak,
  findFlashcardTrack,
  recordFlashcardReview,
} from "@/server/data/progress";
import { NextResponse } from "next/server";
```

Replace everything from `const cardCheck = await pool.query(` through `return NextResponse.json({ ...result.rows[0], streak });` with:

```ts
    const examType = await findFlashcardTrack(flashcardId);

    if (!examType) {
      return NextResponse.json(
        { error: "Flashcard not found" },
        { status: 404 },
      );
    }

    const review = await recordFlashcardReview(
      session.user.id,
      flashcardId,
      mastered,
    );

    // Returned with the answer so the client can celebrate without a second call.
    const streak = await applyStreak(session.user.id, examType, mastered);

    return NextResponse.json({
      id: review.id,
      user_id: review.userId,
      flashcard_id: review.flashcardId,
      reviewed_at: review.reviewedAt,
      mastered: review.mastered,
      streak,
    });
```

Leave the first-line path comment, the auth check, the body validation and the `catch` as they are.

- [ ] **Step 7: Rewire `memorization/[id]/progress/route.ts`**

Replace the imports with:

```ts
import { auth } from "@/lib/auth";
import {
  applyStreak,
  choiceBelongsTo,
  findMemorizationTrack,
  recordMemorizationAnswer,
} from "@/server/data/progress";
import { NextResponse } from "next/server";
```

Replace everything from `// Confirm the memorization item exists` through `return NextResponse.json({ ...result.rows[0], streak });` with:

```ts
    const examType = await findMemorizationTrack(memorizationId);

    if (!examType) {
      return NextResponse.json(
        { error: "Memorization item not found" },
        { status: 404 },
      );
    }

    if (!(await choiceBelongsTo(selected_choice_id, memorizationId))) {
      return NextResponse.json(
        { error: "Choice not found for this memorization item" },
        { status: 404 },
      );
    }

    // Mastery only ever goes up (see recordMemorizationAnswer): a learner
    // working through the deck again watches the count rise rather than
    // trade newly-learnt items for freshly-missed ones.
    const answer = await recordMemorizationAnswer({
      userId: session.user.id,
      memorizationId,
      selectedChoiceId: selected_choice_id,
      isCorrect: is_correct,
      mastered,
    });

    // Returned with the answer so the client can celebrate without a second call.
    const streak = await applyStreak(session.user.id, examType, is_correct);

    return NextResponse.json({
      id: answer.id,
      user_id: answer.userId,
      memorization_id: answer.memorizationId,
      selected_choice_id: answer.selectedChoiceId,
      is_correct: answer.isCorrect,
      reviewed_at: answer.reviewedAt,
      mastered: answer.mastered,
      streak,
    });
```

- [ ] **Step 8: Route tests, typecheck, lint, unit tests**

Run the two route tests from Step 5 → PASS, 3 + 4. Then `pnpm typecheck`, `pnpm lint`, `pnpm test`: all clean.

- [ ] **Step 9: Commit**

```bash
git add src/server/data/progress.ts src/server/data/progress.db.test.ts "src/app/api/flashcards/[id]/progress" "src/app/api/memorization/[id]/progress"
git commit -m "refactor: record flashcard and memorization answers through the progress module"
```

---

### Task 6: Delete the unused routes, flip the pool split, verify, record the outcome

**Files:**
- Delete: `src/app/api/flashcards/[id]/route.ts`, `src/app/api/flashcards/progress/route.ts`, `src/app/api/memorization/[id]/route.ts`, `src/app/api/memorization/[id]/answer/route.ts`, `src/app/api/memorization/progress/route.ts`, `src/app/api/questions/[id]/route.ts`
- Modify: `src/lib/db.ts`, `src/server/db/prisma.ts`, `src/server/data/users.db.test.ts`
- Modify: `docs/superpowers/specs/2026-10-14-prisma-migration-design.md`

**Interfaces:**
- Produces: no study file imports `@/lib/db`.

- [ ] **Step 1: Confirm nothing calls the six routes**

Run:
```bash
git grep -nE "flashcards/progress|memorization/progress|/answer|api/(flashcards|memorization|questions)/\$\{" -- src ":!src/app/api"
```
Expected: exactly two matches. They're the POSTs to `/api/flashcards/${card.id}/progress` (`FlashCardPage.tsx`) and `/api/memorization/${question.id}/progress` (`MemorizationPage.tsx`), and both routes stay. Any other match means something still calls a route this task deletes: stop and report it.

- [ ] **Step 2: Delete them**

```bash
git rm "src/app/api/flashcards/[id]/route.ts" src/app/api/flashcards/progress/route.ts "src/app/api/memorization/[id]/route.ts" "src/app/api/memorization/[id]/answer/route.ts" src/app/api/memorization/progress/route.ts "src/app/api/questions/[id]/route.ts"
```

If `pnpm typecheck` then fails on `.next/dev/types` naming a deleted route, delete `.next/dev/types` (the Wave 1 outcome records the same thing; `next dev` regenerates it).

- [ ] **Step 3: Confirm Wave 2 no longer touches `pg`**

Run: `git grep -l "@/lib/db" -- src/app/api/flashcards src/app/api/memorization src/app/api/questions src/app/api/glossary src/app/api/streaks src/app/api/recent-activity src/lib/helper src/app/learningMethods`
Expected: no output.

- [ ] **Step 4: Flip the split to 2 (`pg`) + 3 (Prisma)**

In `src/lib/db.ts`, replace:

```ts
    // 3 rather than 5 while the Prisma client (max 2) runs beside this pool,
    // so the two together stay within the old 5. Removed with this file.
    max: 3,
```

with:

```ts
    // 2 rather than 5 while the Prisma client (max 3) runs beside this pool,
    // so the two together stay within the old 5. Since Wave 2 the study
    // routes, most of the traffic, read through Prisma. Removed with this file.
    max: 2,
```

In `src/server/db/prisma.ts`, replace the paragraph that begins `` `max: 2` while src/lib/db.ts (max 3) `` and ends `Restored to 5 when db.ts is removed.` with:

```ts
 * `max: 3` while src/lib/db.ts (max 2) still exists beside it, so the two
 * pools together hold no more than the old pool's 5. Since Wave 2 the
 * study routes, the bulk of the traffic, and every session refresh read
 * through this client, so it holds the larger share. Restored to 5 when
 * db.ts is removed.
```

and change `max: 2,` to `max: 3,` in `createClient`.

In `src/server/data/users.db.test.ts`, in the "a busy pool" test, replace:

```ts
    // Hold both of Prisma's connections for three seconds — longer than
    // Prisma's default two-second wait to start a transaction.
```

with:

```ts
    // Hold all three of Prisma's connections for three seconds — longer
    // than Prisma's default two-second wait to start a transaction.
```

and `const holding = Promise.all([hold(), hold()]);` with `const holding = Promise.all([hold(), hold(), hold()]);`.

- [ ] **Step 5: Full verification**

Run each command and record its result line in the ledger:
- `pnpm typecheck` → exit 0
- `pnpm lint` → 0 errors
- `pnpm test` → all pass
- `pnpm test:db` → all pass (it includes the busy-pool test at 3)
- `pnpm parity` → 0 differences (Wave 0's mastery check; still holds)
- `pnpm parity:content` → 0 differences
- `pnpm build` → exit 0

For the manual `pnpm dev` pass, ask Nelson whether to do it and how. The local `insure_dev` holds real people's accounts from the production restore, so don't sign in as any of them. The screens for this wave are the flashcards, memorization, practice exam, glossary (examples and key points should now show) and the dashboard's Quick Access and streaks.

- [ ] **Step 6: Commit the code**

```bash
git add -A src/app/api src/lib/db.ts src/server/db/prisma.ts src/server/data/users.db.test.ts
git commit -m "chore: delete the unused study routes and give Prisma the larger pool"
```

- [ ] **Step 7: Record the outcome in the spec**

In `docs/superpowers/specs/2026-10-14-prisma-migration-design.md`:

1. Change the status line to `**Status:** approved; Waves 0–2 implemented (see Wave 0, 1 and 2 outcomes)`.
2. In "Out of scope", after the sentence about an unknown `exam_type` on the eligibility routes, add: `Wave 2 adds the four study lists to that 400 rule, deletes six study routes nothing called, and puts the glossary's \`details\` back (see Wave 2 outcome).`
3. Append this section before "After the waves", adjusted to match what actually happened (rulings from the ledger, plus anything that surprised you):

```markdown
## Wave 2 outcome (2026-10-14)

- **`src/server/data/content.ts`** reads flashcards, questions, memorization
  and the glossary, returning the API types in `src/lib/types` directly.
  **`progress.ts`** holds per-item answers, streaks, recent activity and
  saved decks. `_lib/streak-store.ts` and `_lib/recent-activity-store.ts`
  had no callers left once those moved, so they were deleted now rather
  than kept as re-exports until Wave 5.
- **The flashcard → question match** (the old `LEFT JOIN LATERAL`) is the
  pure `choicesForCard`, unit-tested. `pnpm parity:content` compares every
  list, every track and every user's memorization answers with the old SQL
  on the production restore: 0 differences.
- **Deleted, unused:** `GET /api/flashcards/[id]`, `GET /api/flashcards/progress`,
  `GET /api/memorization/[id]`, `POST /api/memorization/[id]/answer` (it took
  `user_id` from the body, so anyone signed in could write anyone's
  progress), `GET /api/memorization/progress`, `GET /api/questions/[id]`.
- **Glossary** returns `details` again (a caching commit had dropped it, so
  the cards' examples and key points were empty) and ignores `?q=`: the
  page searches client-side.
- **Unknown `exam_type`** on the four study lists answers 400.
- **Streaks.** The increment is in the upsert and the best is raised
  conditionally in the same transaction, so two answers at once both count;
  a test fires two on a new track.
- **`study_sessions.updated_at`** has no trigger, so `saveSession` sets it.
- **Connection budget** is now 2 (`pg`) + 3 (Prisma).
- **Production needs nothing for this wave:** no migration, no schema change.
```

- [ ] **Step 8: Commit the spec**

```bash
git add docs/superpowers/specs/2026-10-14-prisma-migration-design.md
git commit -m "docs: record what Wave 2 found"
```
