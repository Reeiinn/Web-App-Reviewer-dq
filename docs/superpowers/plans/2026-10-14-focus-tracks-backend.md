# Focus Tracks (Backend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a reviewee save which exam tracks they're focused on, and scope the dashboard, eligibility, Quick Access, streaks and the staff roster to those tracks. With no saved pick, everything behaves exactly as today.

**Architecture:** One additive table, `user_focus_tracks`, read and written only by `src/server/data/focus-tracks.ts`. The "no rows means all four" rule and input validation are pure and live in `src/lib/helper/focus-tracks.ts`. Summary endpoints fetch the reviewee's focus beside their counts and filter, so the counting itself (the mastery views) is untouched.

**Tech Stack:** Next.js 16 route handlers, Prisma 7, zod 4, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-10-14-focus-tracks-backend-design.md` (and the ground rules in `docs/superpowers/specs/2026-10-14-prisma-migration-design.md`)

**Prerequisite:** the Prisma migration is complete (Waves 0–5, merged to `dev`). Everything this plan touches reads through Prisma: `src/server/data/mastery.ts`, `src/server/data/progress.ts` (streaks and recent activity), `src/lib/helper/track-counts.ts`, the db test harness and the delete-a-user test all exist. `src/lib/db.ts`, the `_lib/*-store.ts` files and the `scripts/parity/` scripts are gone.

**Revised 2026-10-15** after Waves 2–5: Task 6 now changes `src/server/data/progress.ts` (the `pg` stores it named were deleted in Wave 2), and Task 8 pins "no selection reads as all four" with a db test instead of the deleted parity script.

## Global Constraints

- **Existing data is never affected.** The only schema change is creating `user_focus_tracks`. No other table, column, index or row is touched.
- **Never touch the Railway database.** Migrations run only against the local dev copy (`MIGRATE_DATABASE_URL`) and the local test database. `.env` is never read or passed to a command. If `.env.local` is missing the three local URLs, ask Nelson for them; never guess.
- **No selection means all four tracks**, in the order `VUL, TRADITIONAL_LIFE, IIAP_A, IIAP_B` (`examTypes`), and is never written as rows.
- **A saved selection has 1–4 distinct valid tracks.** Clearing all is refused.
- **Focus is a lens, not a lock:** endpoints given an explicit `exam_type` serve it regardless of focus.
- **Response shapes stay identical** except the additive `focusTracks` field on roster rows.
- **Backend only.** No changes under `src/app/**/*Page.tsx`, `src/components/`.
- **Commits:** plain messages, sole author Nelson Lago III, **no `Co-Authored-By` or any other trailer.**
- **PR:** `gh pr create --base dev`. Never `main`.
- **pnpm only.**

## Review Focus

1. **Quick Access with focus set:** the focus filter must apply *before* `LIMIT 3`, so a reviewee focused on VUL still sees three VUL entries when newer non-focus visits exist. Pinned by a db test in Task 6.
2. **PUT with a malformed body** (not JSON, `tracks` missing, a string instead of an array, `["VUL","VUL"]`, `[]`, `["IIAP"]`): 400 with `{ error }`, nothing saved. Pinned in Tasks 2 and 4.
3. **Staff calling the settings endpoint:** 403 for both GET and PUT. Pinned in Task 4.
4. **Roster readiness for a one-track reviewee:** mean over one track, not four; `passedTracks` counts within focus. Pinned in Task 7.
5. **Replacing a selection is all-or-nothing:** a failed insert must not leave the user with no rows, which would silently read as "all four". Pinned by the transaction test in Task 3.

---

## File Map

| Path | Responsibility |
| ---- | -------------- |
| `prisma/migrations/20261014000200_user_focus_tracks/migration.sql` | Creates the table |
| `prisma/schema.prisma` | `UserFocusTrack` model, `User.focusTracks` |
| `src/lib/helper/focus-tracks.ts` | Pure: `resolveFocusTracks`, `focusTracksBody` (zod) |
| `src/server/data/focus-tracks.ts` | `getFocusTracks`, `getFocusTracksFor`, `setFocusTracks` |
| `src/app/api/user/focus-tracks/route.ts` | GET/PUT settings endpoint |
| `src/app/api/progress/route.ts`, `src/app/api/_lib/mastery.ts` | Filter to focus |
| `src/app/api/recent-activity/route.ts`, `src/server/data/progress.ts` (`fetchRecent`) | Filter in the query before the limit |
| `src/app/api/streaks/route.ts`, `src/server/data/progress.ts` (`fetchStreaks`) | Filter to focus |
| `src/app/api/admin/reviewees/route.ts` | Per-reviewee focus scoring, `focusTracks` field |
| `src/server/db/user-delete.db.test.ts` | Adds the new table to the cascade check |

---

### Task 1: The `user_focus_tracks` table

**Files:**
- Create: `prisma/migrations/20261014000200_user_focus_tracks/migration.sql`
- Modify: `prisma/schema.prisma`, `src/server/db/user-delete.db.test.ts`

**Interfaces:**
- Produces: Prisma model `UserFocusTrack { userId: string; examType: ExamType; createdAt: Date }`, accessor `prisma.userFocusTrack`, compound id `userId_examType`.

- [ ] **Step 1: Extend the cascade test (failing)**

In `src/server/db/user-delete.db.test.ts`, add `"user_focus_tracks",` to `CASCADE_TABLES`, and after the `recentActivity.create` line add:

```ts
    await prisma.userFocusTrack.create({ data: { userId: user.id, examType: "VUL" } });
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm typecheck`
Expected: FAIL, `Property 'userFocusTrack' does not exist on type 'PrismaClient'`.

- [ ] **Step 3: Write the migration by hand**

```sql
-- prisma/migrations/20261014000200_user_focus_tracks/migration.sql
-- Which tracks a reviewee is focused on. Additive: a new, empty table; no
-- existing table or row changes. No rows for a user means all four tracks.
-- Rollback: DROP TABLE user_focus_tracks;

CREATE TABLE "user_focus_tracks" (
    "user_id"    UUID        NOT NULL,
    "exam_type"  "exam_type" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_focus_tracks_pkey" PRIMARY KEY ("user_id", "exam_type")
);

ALTER TABLE "user_focus_tracks"
  ADD CONSTRAINT "user_focus_tracks_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
```

- [ ] **Step 4: Add the model**

In `prisma/schema.prisma` add:

```prisma
/// Tracks a reviewee is focused on. No rows means all four.
model UserFocusTrack {
  userId    String   @map("user_id") @db.Uuid
  examType  ExamType @map("exam_type")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade, onUpdate: NoAction)

  @@id([userId, examType])
  @@map("user_focus_tracks")
}
```

and on `model User` add the back-relation line `focusTracks UserFocusTrack[]`.

- [ ] **Step 5: Prove the SQL and the schema agree, then apply locally**

```bash
set -a; . ./.env.local; set +a
pnpm exec prisma generate
pnpm exec prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script --shadow-database-url "$TEST_DATABASE_URL"
```

Expected: the same output as Wave 0 Task 3, Step 6 (empty, or only the documented `users_active_idx`/trigger lines) and **nothing mentioning `user_focus_tracks`**. If it does mention it, align the hand-written SQL with the schema and run it again.

Apply to the local dev copy only: `pnpm exec prisma migrate deploy` → `1 migration applied`.

- [ ] **Step 6: Run the tests**

Run: `pnpm typecheck` → no errors. Run: `pnpm test:db` → PASS. The reset replays the new migration, and the cascade test now covers `user_focus_tracks`.

- [ ] **Step 7: Commit**

```bash
git add prisma/migrations/20261014000200_user_focus_tracks prisma/schema.prisma src/server/db/user-delete.db.test.ts
git commit -m "feat: add the user_focus_tracks table"
```

---

### Task 2: Focus rules and input validation (pure)

**Files:**
- Create: `src/lib/helper/focus-tracks.ts`
- Test: `src/lib/helper/focus-tracks.test.ts`

**Interfaces:**
- Consumes: `examTypes`, `isExamType`, `ExamType` (`src/lib/types/common.ts`).
- Produces (exact):

```ts
export type FocusTracks = { tracks: ExamType[]; chosen: boolean };
export function resolveFocusTracks(saved: readonly string[]): FocusTracks;
export const focusTracksBody: z.ZodType<{ tracks: ExamType[] }>;
export function firstIssue(error: z.ZodError): string;
```

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/helper/focus-tracks.test.ts
import { describe, expect, it } from "vitest";
import { firstIssue, focusTracksBody, resolveFocusTracks } from "./focus-tracks";

describe("resolveFocusTracks", () => {
  it("reads no saved tracks as all four, not chosen", () => {
    expect(resolveFocusTracks([])).toEqual({
      tracks: ["VUL", "TRADITIONAL_LIFE", "IIAP_A", "IIAP_B"],
      chosen: false,
    });
  });

  it("returns a saved pick in the standard order", () => {
    expect(resolveFocusTracks(["IIAP_B", "VUL"])).toEqual({
      tracks: ["VUL", "IIAP_B"],
      chosen: true,
    });
  });

  it("ignores values that are not tracks", () => {
    expect(resolveFocusTracks(["IIAP"])).toEqual(resolveFocusTracks([]));
  });
});

describe("focusTracksBody", () => {
  const parse = (body: unknown) => focusTracksBody.safeParse(body);

  it("accepts one to four distinct tracks", () => {
    expect(parse({ tracks: ["VUL"] }).success).toBe(true);
    expect(parse({ tracks: ["VUL", "TRADITIONAL_LIFE", "IIAP_A", "IIAP_B"] }).success).toBe(true);
  });

  it.each([
    [{ tracks: [] }, "Pick at least one track"],
    [{ tracks: ["VUL", "VUL"] }, "Each track can be picked once"],
    [{ tracks: ["IIAP"] }, "Unknown track"],
    [{ tracks: "VUL" }, undefined],
    [{}, undefined],
    [null, undefined],
  ])("rejects %j", (body, message) => {
    const result = parse(body);
    expect(result.success).toBe(false);
    if (!result.success && message) expect(firstIssue(result.error)).toBe(message);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run --project unit src/lib/helper/focus-tracks.test.ts` → FAIL, unresolved import.

- [ ] **Step 3: Implement**

```ts
// src/lib/helper/focus-tracks.ts
import { z } from "zod";
import { examTypes, isExamType, type ExamType } from "@/lib/types/common";

/** The tracks a reviewee's summaries cover, and whether they picked them. */
export type FocusTracks = { tracks: ExamType[]; chosen: boolean };

/**
 * Saved rows to the tracks in effect. Nothing saved means all four: that is
 * every existing account and every new one until a pick is made, and it is
 * never written down as rows. Tracks come back in the standard order whatever
 * order they were picked in.
 */
export function resolveFocusTracks(saved: readonly string[]): FocusTracks {
  const picked = examTypes.filter((track) => saved.includes(track));
  return picked.length > 0
    ? { tracks: picked, chosen: true }
    : { tracks: [...examTypes], chosen: false };
}

/** Body of PUT /api/user/focus-tracks. */
export const focusTracksBody = z.object({
  tracks: z
    .array(z.custom<ExamType>((value) => isExamType(value), "Unknown track"))
    .min(1, "Pick at least one track")
    .max(examTypes.length, "There are only four tracks")
    .refine(
      (tracks) => new Set(tracks).size === tracks.length,
      "Each track can be picked once",
    ),
});

/** The first validation message, for the `{ error }` every route answers with. */
export const firstIssue = (error: z.ZodError) =>
  error.issues[0]?.message ?? "Invalid request body";
```

- [ ] **Step 4: Run it to see it pass**

Run: `pnpm vitest run --project unit src/lib/helper/focus-tracks.test.ts` → PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/helper/focus-tracks.ts src/lib/helper/focus-tracks.test.ts
git commit -m "feat: define the focus-track rule and its input schema"
```

---

### Task 3: Focus-track data module

**Files:**
- Create: `src/server/data/focus-tracks.ts`
- Test: `src/server/data/focus-tracks.db.test.ts`

**Interfaces:**
- Consumes: `prisma` (Wave 0); `resolveFocusTracks`, `FocusTracks` (Task 2); `createUser`, `deleteUsers` (Wave 0 fixtures).
- Produces (exact):

```ts
export async function getFocusTracks(userId: string): Promise<FocusTracks>;
export async function getFocusTracksFor(userIds: string[]): Promise<Map<string, FocusTracks>>; // every id present
export async function setFocusTracks(userId: string, tracks: ExamType[]): Promise<FocusTracks>;
```

- [ ] **Step 1: Write the failing DB test**

```ts
// src/server/data/focus-tracks.db.test.ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "@/server/db/prisma";
import { createUser, deleteUsers } from "@/test/db-fixtures";
import { getFocusTracks, getFocusTracksFor, setFocusTracks } from "./focus-tracks";

let a: string;
let b: string;

beforeAll(async () => {
  a = (await createUser()).id;
  b = (await createUser()).id;
});

afterAll(async () => {
  await deleteUsers(a, b);
});

describe("focus tracks", () => {
  it("reads a user with nothing saved as all four", async () => {
    expect(await getFocusTracks(a)).toEqual({
      tracks: ["VUL", "TRADITIONAL_LIFE", "IIAP_A", "IIAP_B"],
      chosen: false,
    });
  });

  it("saves a pick and reads it back in order", async () => {
    expect(await setFocusTracks(a, ["IIAP_A", "VUL"])).toEqual({ tracks: ["VUL", "IIAP_A"], chosen: true });
    expect(await getFocusTracks(a)).toEqual({ tracks: ["VUL", "IIAP_A"], chosen: true });
  });

  it("replaces rather than adds to an earlier pick", async () => {
    await setFocusTracks(a, ["TRADITIONAL_LIFE"]);
    expect((await getFocusTracks(a)).tracks).toEqual(["TRADITIONAL_LIFE"]);
    expect(await prisma.userFocusTrack.count({ where: { userId: a } })).toBe(1);
  });

  it("keeps the old pick when the replacement fails", async () => {
    await setFocusTracks(a, ["VUL"]);
    // A duplicate violates the primary key inside the transaction.
    await expect(setFocusTracks(a, ["IIAP_B", "IIAP_B"])).rejects.toThrow();
    expect((await getFocusTracks(a)).tracks).toEqual(["VUL"]);
  });

  it("answers for every user in one call", async () => {
    await setFocusTracks(a, ["VUL"]);
    const map = await getFocusTracksFor([a, b]);
    expect(map.get(a)).toEqual({ tracks: ["VUL"], chosen: true });
    expect(map.get(b)?.chosen).toBe(false);
    expect((await getFocusTracksFor([])).size).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm test:db` → FAIL, unresolved `./focus-tracks`.

- [ ] **Step 3: Implement**

```ts
// src/server/data/focus-tracks.ts
import "server-only";
import prisma from "@/server/db/prisma";
import { resolveFocusTracks, type FocusTracks } from "@/lib/helper/focus-tracks";
import type { ExamType } from "@/lib/types/common";

/** The tracks one user's summaries cover. */
export async function getFocusTracks(userId: string): Promise<FocusTracks> {
  const rows = await prisma.userFocusTrack.findMany({
    where: { userId },
    select: { examType: true },
  });
  return resolveFocusTracks(rows.map((row) => row.examType));
}

/** The same for many users in one query, for the roster. */
export async function getFocusTracksFor(
  userIds: string[],
): Promise<Map<string, FocusTracks>> {
  if (userIds.length === 0) return new Map();

  const rows = await prisma.userFocusTrack.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, examType: true },
  });
  const saved = new Map<string, string[]>();
  for (const row of rows) {
    saved.set(row.userId, [...(saved.get(row.userId) ?? []), row.examType]);
  }
  return new Map(
    userIds.map((id) => [id, resolveFocusTracks(saved.get(id) ?? [])]),
  );
}

/**
 * Replaces a user's pick. One transaction, so a failure leaves the old pick
 * in place: an empty set would otherwise read as "all four" without anyone
 * having chosen it. Callers validate with focusTracksBody first.
 */
export async function setFocusTracks(
  userId: string,
  tracks: ExamType[],
): Promise<FocusTracks> {
  await prisma.$transaction([
    prisma.userFocusTrack.deleteMany({ where: { userId } }),
    prisma.userFocusTrack.createMany({
      data: tracks.map((examType) => ({ userId, examType })),
    }),
  ]);
  return resolveFocusTracks(tracks);
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `pnpm test:db` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/data/focus-tracks.ts src/server/data/focus-tracks.db.test.ts
git commit -m "feat: read and replace a reviewee's focus tracks"
```

---

### Task 4: Settings endpoint `/api/user/focus-tracks`

**Files:**
- Create: `src/app/api/user/focus-tracks/route.ts`
- Test: `src/app/api/user/focus-tracks/route.test.ts`

**Interfaces:**
- Consumes: `getFocusTracks`, `setFocusTracks` (Task 3); `focusTracksBody`, `firstIssue` (Task 2); `auth` (`@/lib/auth`).
- Produces: `GET` → `200 { tracks, chosen }`; `PUT { tracks }` → `200 { tracks, chosen: true }`. Errors: 401 signed out, 403 staff, 400 bad body, 500 store failure. All errors are `{ error }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/user/focus-tracks/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getFocusTracks, setFocusTracks } = vi.hoisted(() => ({
  auth: vi.fn(),
  getFocusTracks: vi.fn(),
  setFocusTracks: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/focus-tracks", () => ({ getFocusTracks, setFocusTracks }));

import { GET, PUT } from "./route";

const put = (body: string) =>
  PUT(
    new Request("http://internal.local/api/user/focus-tracks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
    }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
});

describe("/api/user/focus-tracks", () => {
  it("answers 401 when signed out", async () => {
    auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect((await put(`{"tracks":["VUL"]}`)).status).toBe(401);
  });

  it.each(["MANAGER", "ADMIN"])("answers 403 to %s", async (role) => {
    auth.mockResolvedValue({ user: { id: "s1", role } });
    expect((await GET()).status).toBe(403);
    expect((await put(`{"tracks":["VUL"]}`)).status).toBe(403);
    expect(setFocusTracks).not.toHaveBeenCalled();
  });

  it("reads the caller's tracks", async () => {
    getFocusTracks.mockResolvedValue({ tracks: ["VUL"], chosen: true });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tracks: ["VUL"], chosen: true });
    expect(getFocusTracks).toHaveBeenCalledWith("u1");
  });

  it("saves a valid pick", async () => {
    setFocusTracks.mockResolvedValue({ tracks: ["VUL", "IIAP_A"], chosen: true });
    const response = await put(`{"tracks":["IIAP_A","VUL"]}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tracks: ["VUL", "IIAP_A"], chosen: true });
    expect(setFocusTracks).toHaveBeenCalledWith("u1", ["IIAP_A", "VUL"]);
  });

  it.each([
    ["not json", "Invalid request body"],
    [`{"tracks":[]}`, "Pick at least one track"],
    [`{"tracks":["VUL","VUL"]}`, "Each track can be picked once"],
    [`{"tracks":["IIAP"]}`, "Unknown track"],
    [`{"tracks":"VUL"}`, undefined],
  ])("answers 400 to %s and saves nothing", async (body, message) => {
    const response = await put(body);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(typeof json.error).toBe("string");
    if (message) expect(json.error).toBe(message);
    expect(setFocusTracks).not.toHaveBeenCalled();
  });

  it("answers 500 when saving fails", async () => {
    setFocusTracks.mockRejectedValue(new Error("db down"));
    expect((await put(`{"tracks":["VUL"]}`)).status).toBe(500);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run --project unit src/app/api/user/focus-tracks` → FAIL, unresolved `./route`.

- [ ] **Step 3: Implement**

```ts
// src/app/api/user/focus-tracks/route.ts
import { auth } from "@/lib/auth";
import { firstIssue, focusTracksBody } from "@/lib/helper/focus-tracks";
import { getFocusTracks, setFocusTracks } from "@/server/data/focus-tracks";
import { NextResponse } from "next/server";

/**
 * The tracks a reviewee is focused on, chosen from their settings. Staff
 * accounts oversee rather than study, and their progress is never shown, so
 * they have no focus to set.
 */
async function reviewee() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "USER") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { userId: session.user.id };
}

export async function GET() {
  const caller = await reviewee();
  if ("error" in caller) return caller.error;

  try {
    return NextResponse.json(await getFocusTracks(caller.userId));
  } catch (error) {
    console.error("Error fetching focus tracks:", error);
    return NextResponse.json({ error: "Failed to fetch focus tracks" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const caller = await reviewee();
  if ("error" in caller) return caller.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = focusTracksBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  try {
    return NextResponse.json(await setFocusTracks(caller.userId, parsed.data.tracks));
  } catch (error) {
    console.error("Error saving focus tracks:", error);
    return NextResponse.json({ error: "Failed to save focus tracks" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `pnpm test` → PASS. Run: `pnpm typecheck` → no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/user/focus-tracks
git commit -m "feat: let a reviewee read and change their focus tracks"
```

---

### Task 5: Scope the dashboard summary and eligibility

**Files:**
- Modify: `src/app/api/progress/route.ts`, `src/app/api/_lib/mastery.ts` (`fetchAllEligibility` only)
- Test: `src/app/api/progress/route.test.ts`, `src/app/api/attempts/eligibility/route.test.ts` (both from Wave 0)

**Interfaces:**
- Consumes: `getFocusTracks` (Task 3); `getTrackCounts` (Wave 0).
- Produces: same response shapes, filtered to focus tracks. `fetchEligibility(userId, examType)` is unchanged (rule 4).

- [ ] **Step 1: Extend the tests (failing)**

In **both** test files, add `getFocusTracks: vi.fn()` to the `vi.hoisted` object, add `vi.mock("@/server/data/focus-tracks", () => ({ getFocusTracks }));`, and in `beforeEach` add:

```ts
  getFocusTracks.mockResolvedValue({
    tracks: ["VUL", "TRADITIONAL_LIFE", "IIAP_A", "IIAP_B"],
    chosen: false,
  });
```

so every existing test runs with no selection and must still pass unchanged.

Add to `src/app/api/progress/route.test.ts`:

```ts
  it("lists only the reviewee's focus tracks", async () => {
    getFocusTracks.mockResolvedValue({ tracks: ["IIAP_A"], chosen: true });
    getTrackCounts.mockResolvedValue([
      buildTrackCounts("VUL", { exam_type: "VUL", flashcards: 1, memorization: 0, questions: 0 }, undefined),
      buildTrackCounts("IIAP_A", { exam_type: "IIAP_A", flashcards: 1, memorization: 0, questions: 0 }, undefined),
    ]);
    const body = await (await GET()).json();
    expect(body.map((row: { exam_type: string }) => row.exam_type)).toEqual(["IIAP_A"]);
  });
```

Add to `src/app/api/attempts/eligibility/route.test.ts`:

```ts
  it("keys only focus tracks in the all-tracks form", async () => {
    getFocusTracks.mockResolvedValue({ tracks: ["TRADITIONAL_LIFE"], chosen: true });
    getTrackCounts.mockResolvedValue([
      buildTrackCounts("VUL", { exam_type: "VUL", flashcards: 1, memorization: 1, questions: 0 }, undefined),
      buildTrackCounts("TRADITIONAL_LIFE", { exam_type: "TRADITIONAL_LIFE", flashcards: 1, memorization: 1, questions: 0 }, undefined),
    ]);
    expect(Object.keys(await (await get()).json())).toEqual(["TRADITIONAL_LIFE"]);
  });

  it("still answers for a named track outside focus", async () => {
    getFocusTracks.mockResolvedValue({ tracks: ["TRADITIONAL_LIFE"], chosen: true });
    getTrackCount.mockResolvedValue(
      buildTrackCounts("VUL", { exam_type: "VUL", flashcards: 1, memorization: 1, questions: 0 }, undefined),
    );
    expect((await get("?exam_type=VUL")).status).toBe(200);
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run --project unit src/app/api/progress src/app/api/attempts/eligibility`
Expected: the two "only focus" tests FAIL (all tracks returned). Everything else passes.

- [ ] **Step 3: Implement**

`src/app/api/progress/route.ts`: add `import { getFocusTracks } from "@/server/data/focus-tracks";` and replace `const tracks = await getTrackCounts(session.user.id);` with:

```ts
    // Only the tracks the reviewee is focused on; with none chosen, all four.
    const [counts, focus] = await Promise.all([
      getTrackCounts(session.user.id),
      getFocusTracks(session.user.id),
    ]);
    const tracks = counts.filter((t) => focus.tracks.includes(t.examType));
```

`src/app/api/_lib/mastery.ts`: add `import { getFocusTracks } from "@/server/data/focus-tracks";` and change `fetchAllEligibility`'s body to:

```ts
  const [counts, focus] = await Promise.all([
    getTrackCounts(userId),
    getFocusTracks(userId),
  ]);
  const tracks = eligibleTracks(
    counts.filter((t) => focus.tracks.includes(t.examType)),
  );
  return Object.fromEntries(
    tracks.map((t) => [t.examType, deriveEligibility(t.flashcards, t.memorization)]),
  );
```

Update its doc comment's first line to: `Practice-exam eligibility for every focus track with decks, keyed by exam_type.`

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/progress src/app/api/_lib/mastery.ts src/app/api/attempts/eligibility/route.test.ts
git commit -m "feat: scope the dashboard summary and eligibility to focus tracks"
```

---

### Task 6: Scope Quick Access and streaks

**Files:**
- Modify: `src/server/data/progress.ts` (`fetchRecent`, `fetchStreaks`), `src/app/api/recent-activity/route.ts`, `src/app/api/streaks/route.ts`
- Test: `src/server/data/progress.db.test.ts` (extend), `src/app/api/streaks/route.test.ts`

**Interfaces:**
- Consumes: `getFocusTracks` (Task 3).
- Produces: `fetchRecent(userId: string, limit: number, tracks: readonly ExamType[]): Promise<RecentActivityRow[]>`; `fetchStreaks(userId: string, tracks: readonly ExamType[]): Promise<StreakRow[]>`.

- [ ] **Step 1: Check other callers**

Run: `pnpm exec rg -n "fetchRecent\(|fetchStreaks\(" src`
Expected: only the two routes. If anything else calls them, pass it `examTypes` (all four) so it behaves as before, and list it in the commit body.

- [ ] **Step 2: Write the failing tests**

```ts
// src/server/data/progress.db.test.ts — add as its own describe block, with
// whatever imports the file doesn't already have. Check the fixture names
// in src/test/db-fixtures.ts before using them.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "@/server/db/prisma";
import { createUser, deleteUsers } from "@/test/db-fixtures";
import { fetchRecent } from "./progress";

let userId: string;

beforeAll(async () => {
  userId = (await createUser()).id;
  const at = (minute: number) => new Date(Date.UTC(2026, 9, 14, 9, minute));
  // Three older VUL visits, then two newer visits on other tracks.
  await prisma.recentActivity.createMany({
    data: [
      { userId, examType: "VUL", mode: "flashcards", visitedAt: at(1) },
      { userId, examType: "VUL", mode: "memorization", visitedAt: at(2) },
      { userId, examType: "VUL", mode: "practice", visitedAt: at(3) },
      { userId, examType: "IIAP_A", mode: "flashcards", visitedAt: at(4) },
      { userId, examType: "IIAP_B", mode: "flashcards", visitedAt: at(5) },
    ],
  });
});

afterAll(async () => {
  await deleteUsers(userId);
});

describe("fetchRecent", () => {
  it("filters to focus tracks before the limit", async () => {
    const rows = await fetchRecent(userId, 3, ["VUL"]);
    expect(rows.map((r) => r.exam_type)).toEqual(["VUL", "VUL", "VUL"]);
    expect(rows.map((r) => r.mode)).toEqual(["practice", "memorization", "flashcards"]);
  });

  it("returns the newest across all tracks when all four are in focus", async () => {
    const rows = await fetchRecent(userId, 3, ["VUL", "TRADITIONAL_LIFE", "IIAP_A", "IIAP_B"]);
    expect(rows.map((r) => r.exam_type)).toEqual(["IIAP_B", "IIAP_A", "VUL"]);
  });
});
```

```ts
// src/app/api/streaks/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, fetchStreaks, getFocusTracks } = vi.hoisted(() => ({
  auth: vi.fn(),
  fetchStreaks: vi.fn(),
  getFocusTracks: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/progress", () => ({ fetchStreaks }));
vi.mock("@/server/data/focus-tracks", () => ({ getFocusTracks }));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  fetchStreaks.mockResolvedValue([]);
});

describe("GET /api/streaks", () => {
  it("asks only for focus tracks", async () => {
    getFocusTracks.mockResolvedValue({ tracks: ["VUL"], chosen: true });
    await GET();
    expect(fetchStreaks).toHaveBeenCalledWith("u1", ["VUL"]);
  });

  it("asks for all four with no selection", async () => {
    getFocusTracks.mockResolvedValue({
      tracks: ["VUL", "TRADITIONAL_LIFE", "IIAP_A", "IIAP_B"],
      chosen: false,
    });
    await GET();
    expect(fetchStreaks).toHaveBeenCalledWith("u1", ["VUL", "TRADITIONAL_LIFE", "IIAP_A", "IIAP_B"]);
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `pnpm test:db` → the `fetchRecent` focus test FAILS (5 rows' newest three include IIAP). Run: `pnpm vitest run --project unit src/app/api/streaks` → FAIL (called with one argument).

- [ ] **Step 4: Implement**

`src/server/data/progress.ts`, `fetchRecent`:

```ts
export async function fetchRecent(
  userId: string,
  limit: number,
  /** Only these tracks; filtered before the limit so Quick Access still fills. */
  tracks: readonly ExamType[],
): Promise<RecentActivityRow[]> {
  const rows = await prisma.recentActivity.findMany({
    where: { userId, examType: { in: [...tracks] } },
    orderBy: { visitedAt: "desc" },
    take: limit,
    select: { examType: true, mode: true, visitedAt: true },
  });
```

(The mapping below it is unchanged.)

`src/app/api/recent-activity/route.ts`: add `import { getFocusTracks } from "@/server/data/focus-tracks";` and replace the `return NextResponse.json(await fetchRecent(...))` call with:

```ts
    const focus = await getFocusTracks(session.user.id);
    return NextResponse.json(
      await fetchRecent(session.user.id, QUICK_ACCESS_LIMIT, focus.tracks),
    );
```

`src/server/data/progress.ts`, `fetchStreaks`:

```ts
export async function fetchStreaks(
  userId: string,
  tracks: readonly ExamType[],
): Promise<StreakRow[]> {
  const rows = await prisma.studyStreak.findMany({
    where: { userId, examType: { in: [...tracks] } },
    select: { examType: true, currentStreak: true, bestStreak: true, lastAnswerAt: true },
  });
```

(The mapping is unchanged.)

`src/app/api/streaks/route.ts`: add the `getFocusTracks` import and use:

```ts
    const focus = await getFocusTracks(session.user.id);
    return NextResponse.json(await fetchStreaks(session.user.id, focus.tracks));
```

- [ ] **Step 5: Run them to see them pass**

Run: `pnpm test` → PASS. Run: `pnpm test:db` → PASS. Run: `pnpm typecheck` → no errors.

- [ ] **Step 6: Commit**

```bash
git add src/server/data/progress.ts src/server/data/progress.db.test.ts src/app/api/recent-activity src/app/api/streaks
git commit -m "feat: scope Quick Access and streaks to focus tracks"
```

---

### Task 7: Score the roster on each reviewee's focus tracks

**Files:**
- Modify: `src/app/api/admin/reviewees/route.ts`
- Test: `src/app/api/admin/reviewees/route.test.ts` (from Wave 0)

**Interfaces:**
- Consumes: `getFocusTracksFor` (Task 3); `getTrackCountsFor` (Wave 0).
- Produces: each roster row gains `focusTracks: { tracks: ExamType[]; chosen: boolean }`. `readiness`, `status`, the count columns, `byExam` and `practiceExam` cover that reviewee's focus tracks. With `?exam_type=X`, every row covers X alone.

- [ ] **Step 1: Extend the test (failing)**

In `src/app/api/admin/reviewees/route.test.ts`, add `getFocusTracksFor: vi.fn()` to `vi.hoisted`, add `vi.mock("@/server/data/focus-tracks", () => ({ getFocusTracksFor }));`, and in `beforeEach`:

```ts
  getFocusTracksFor.mockImplementation(async (ids: string[]) =>
    new Map(ids.map((id) => [id, { tracks: [...examTypes], chosen: false }])),
  );
```

Existing tests must pass unchanged. Then add:

```ts
  it("scores a VUL-only reviewee on VUL alone", async () => {
    getFocusTracksFor.mockResolvedValue(new Map([["r1", { tracks: ["VUL"], chosen: true }]]));
    const done: ProgressRow = {
      user_id: "r1", exam_type: "VUL", flashcards_mastered: 1, memorization_mastered: 1,
      memorization_answered: 1, memorization_correct: 1, questions_mastered: 1,
      attempts_taken: 5, passing_attempts: 5, last_reviewed_at: null, last_answer_at: null,
    };
    getTrackCountsFor.mockImplementation(async (ids: string[], tracks: string[]) =>
      new Map([[ids[0], tracks.map((t) =>
        buildTrackCounts(t as never, totals(t), t === "VUL" ? done : undefined))]]),
    );

    const [row] = await (await GET(new Request("http://internal.local/api/admin/reviewees"))).json();

    expect(row.readiness).toBe(100);
    expect(row.status).toBe("EXAM_READY");
    expect(row.byExam.map((e: { examType: string }) => e.examType)).toEqual(["VUL"]);
    expect(row.practiceExam).toMatchObject({ passedTracks: 1, taken: 5 });
    expect(row.practiceExam.tracks).toHaveLength(1);
    expect(row.flashcards).toEqual({ total: 1, mastered: 1 });
    expect(row.focusTracks).toEqual({ tracks: ["VUL"], chosen: true });
  });

  it("zooms every row to ?exam_type, in focus or not", async () => {
    getFocusTracksFor.mockResolvedValue(new Map([["r1", { tracks: ["VUL"], chosen: true }]]));
    getTrackCountsFor.mockImplementation(async (ids: string[], tracks: string[]) =>
      new Map([[ids[0], tracks.map((t) => buildTrackCounts(t as never, totals(t), undefined))]]),
    );
    const [row] = await (await GET(new Request("http://internal.local/api/admin/reviewees?exam_type=IIAP_B"))).json();
    expect(row.byExam.map((e: { examType: string }) => e.examType)).toEqual(["IIAP_B"]);
    expect(row.focusTracks.tracks).toEqual(["VUL"]);
  });
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run --project unit src/app/api/admin/reviewees` → the two new tests FAIL (four tracks scored, no `focusTracks`).

- [ ] **Step 3: Implement**

Add `import { getFocusTracksFor } from "@/server/data/focus-tracks";`.

Replace `const countsByUser = await getTrackCountsFor(userIds, tracks);` with:

```ts
    // Every track is counted once for everybody; each reviewee is then scored
    // on their own focus tracks. A ?exam_type zoom overrides focus, so staff
    // can look at one track across the whole roster.
    const [countsByUser, focusByUser] = await Promise.all([
      getTrackCountsFor(userIds, tracks),
      getFocusTracksFor(userIds),
    ]);
```

Change the start of `perTrack` so it keeps only that reviewee's tracks:

```ts
    const roster = users.map((user) => {
      const focus = focusByUser.get(user.id)!;
      const scored = selected ? [selected] : focus.tracks;
      const perTrack = (countsByUser.get(user.id) ?? [])
        .filter((t) => scored.includes(t.examType))
        .map((t) => ({
```

(The rest of the `.map` body is unchanged.)

In the returned row object, add after `activity: { lastActivity },`:

```ts
        // Which tracks this row is scored on, and whether the reviewee chose
        // them (false means none chosen yet, so all four).
        focusTracks: focus,
```

Update the route's doc comment: replace "readiness is the mean of the per-track readiness scores" with "readiness is the mean of the per-track readiness scores over the reviewee's focus tracks (all four until they choose)".

- [ ] **Step 4: Run it to see it pass**

Run: `pnpm test` → PASS. Run: `pnpm typecheck` → no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/reviewees
git commit -m "feat: score each reviewee on their own focus tracks in the roster"
```

---

### Task 8: Verify "no selection changes nothing", then open the PR

**Files:**
- Test: `src/server/data/focus-tracks.db.test.ts` (from Task 3; extend)

**Interfaces:**
- Consumes: `getFocusTracks`, `getFocusTracksFor` (Task 3).

The parity scripts were deleted in Wave 5, so this is pinned by a db test
rather than a run over the production restore.

- [ ] **Step 1: Pin "no selection reads as all four"**

Add to `src/server/data/focus-tracks.db.test.ts` (if Task 3 already covers
both cases, skip this step):

```ts
  it("reads a user with no rows as all four, alone and in a batch", async () => {
    const { id } = await createUser();
    try {
      expect(await getFocusTracks(id)).toEqual({ tracks: [...examTypes], chosen: false });
      expect((await getFocusTracksFor([id])).get(id)).toEqual({
        tracks: [...examTypes],
        chosen: false,
      });
    } finally {
      await deleteUsers(id);
    }
  });
```

On the untouched local copy, a read-only
`SELECT count(*) FROM user_focus_tracks;` must return 0.

- [ ] **Step 2: Run everything**

- `pnpm typecheck`: no errors
- `pnpm lint`: no new errors
- `pnpm test`: pass
- `pnpm test:db`: pass
- `pnpm build`: succeeds

Manual check with `pnpm dev` against the local copy, signed in as a seeded reviewee:
1. `/dashboard` looks exactly as before (no selection).
2. In the browser console: `await fetch("/api/user/focus-tracks", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tracks: ["VUL"] }) }).then(r => r.json())` → `{ tracks: ["VUL"], chosen: true }`.
3. Reload `/dashboard`: only VUL is summarised. Open a non-focus track's flashcards by URL: it still loads (lens, not lock).
4. Sign in as an admin. `/admin` shows that reviewee scored on VUL alone.
5. Reset: `DELETE FROM user_focus_tracks WHERE user_id = '<id>'` on the **local** copy only, then confirm `/dashboard` is back to all tracks.

Take screenshots of steps 1, 3 and 4 with the built-in browser.

- [ ] **Step 3: Commit and open the PR**

```bash
git add src/server/data/focus-tracks.db.test.ts
git commit -m "test: check that reviewees with no focus selection read as all four"
git push origin nelson
```

If the Wave 5 PR into `dev` is **still open**, these commits join it. Ask Nelson whether to wait for that merge, or to put this work on its own branch (`git switch -c nelson-focus-tracks`) and open a separate PR. Then:

```bash
gh pr create --base dev --title "Focus tracks (backend)" --body-file <scratchpad>/pr-body.md
```

PR body (no attribution line, per Nelson):

```md
Implements docs/superpowers/specs/2026-10-14-focus-tracks-backend-design.md. Backend only; the picker UI is a follow-up.

- New table `user_focus_tracks` (additive). No rows = all four tracks, so every existing account behaves exactly as before.
- `GET/PUT /api/user/focus-tracks` for reviewees (staff get 403); 1–4 distinct tracks, validated with zod, replaced in one transaction.
- Dashboard summary, eligibility (all-tracks form), Quick Access and streaks list only focus tracks. Endpoints given an explicit track still serve any track.
- Roster scores each reviewee on their own focus tracks and adds `focusTracks` to each row; `?exam_type=X` still zooms everyone to X.

Verification: typecheck, lint, unit + db tests, build, manual check with screenshots.

**Production (Nelson, after merge):** backup; `ALLOW_REMOTE_MIGRATE=1 MIGRATE_DATABASE_URL=<railway> pnpm exec prisma migrate deploy` (creates one empty table); confirm /dashboard and /admin are unchanged. Rollback: `DROP TABLE user_focus_tracks;`.
```

Bind the PR in the app (`ccd_pr` tools) and report the link.
