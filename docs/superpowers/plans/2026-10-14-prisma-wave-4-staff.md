# Prisma Wave 4 (Staff) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every staff query off the `pg` pool and onto one Prisma data module: the roster's reviewee list, the managers list, removing a reviewee, nudges (sending, listing, taking back, reading), the audit log and presence stamps. After this wave nothing in `src` imports `@/lib/db`; Wave 5 deletes it.

**Architecture:** `src/server/data/staff.ts` owns `nudges` and `admin_actions`, `users.last_seen_at` and `users.deleted_at`, and the staff reads of `users` (roster, managers, the account a staff action targets). It returns camelCase records; the routes keep auth, validation and response shaping, and map records back to today's JSON. `_lib/presence-store.ts` and `_lib/audit-store.ts` move into `staff.ts` and are deleted, with their five callers repointed. A one-off parity script compares the old SQL with the new reads on the local production restore.

**Tech Stack:** Next.js 16 route handlers, Prisma 7.10 (`@/generated/prisma/client`, `@prisma/adapter-pg`), PostgreSQL, Vitest 4 (`unit` and `db` projects).

**Spec:** `docs/superpowers/specs/2026-10-14-prisma-migration-design.md`. Read the Wave 0–3 outcomes first.

## Global Constraints

- **Existing data is never affected.** This wave adds no migration and changes no schema. If a task seems to need one, stop and ask.
- **Never touch the Railway database.** No `prisma db push`, `migrate dev`, `migrate deploy`, `migrate resolve` or `migrate reset` against it. Don't read `.env`. Every DB command uses `.env.local` (local `insure_dev` through `MIGRATE_DATABASE_URL`, test DB `insure` through `TEST_DATABASE_URL`).
- **Response shapes stay byte-for-byte compatible,** key order included. One intended change (Nelson to approve before Task 3), and nothing else may change:
  1. Removing a reviewee writes its `reviewee.removed` audit row only when that request actually stamped `deleted_at`. Before, two removals racing both passed the lookup and both wrote an audit row; the second `UPDATE` changed nothing. Both requests still answer 200 with the same body.
- **Raw SQL stays only in `src/server/data/mastery.ts`.** `staff.ts` uses the Prisma query API only: no `$queryRaw` or `$executeRaw`.
- **Writes that may match nothing use `updateMany` / `deleteMany`,** not `update` / `delete`, so a missing row is a no-op as the old `UPDATE` / `DELETE` was, not a Prisma `P2025` error.
- **Clock:** `now()` in the old SQL becomes `new Date()` (the Wave 1 ruling; sessions are pinned to UTC). `nudges.created_at` is `@default(now())`, which Prisma fills on the client (Wave 3 finding), so the cooldown now compares two app-clock instants.
- **`updated_at`:** `users` has the `set_updated_at` trigger; don't set `updatedAt` from Prisma. `nudges` and `admin_actions` have no `updated_at` column.
- **A removed recruiter still shows as the manager.** The old roster `LEFT JOIN users m ON m.id = u.manager_id` did not filter `m.deleted_at`; neither does the new read.
- **Connection budget stays 2 (`pg`) + 3 (Prisma).** After this wave nothing imports `src/lib/db.ts`, so its pool is never created; Wave 5 deletes the file and restores Prisma's pool to 5. Don't change either pool here.
- **Commits:** plain messages, sole author Nelson Lago III, **no `Co-Authored-By` or any other trailer.**
- **PR:** `gh pr create --base dev`, never `main`.
- **Next.js 16:** this plan edits route handler bodies only and touches no other Next API. Before touching any, read `node_modules/next/dist/docs/`.
- **pnpm only.** Unit tests: `pnpm test`. DB tests: `pnpm test:db` (rebuilds the local `insure` test DB from migrations; Nelson has consented to that wipe).

## Review Focus

1. **The same reviewee removed twice at once** (a double-clicked confirm, or two staff on one row). Expected: both answer 200 with the same body; one `reviewee.removed` audit row. Pinned in Task 3 (`removeReviewee` returns `false` the second time; route test asserts no audit write when it does).
2. **A unit manager reaching another manager's reviewee** — removing, nudging, listing their reminders or deleting one. Expected: 403 with today's error text, nothing written. Pinned in Task 3 and Task 4 route tests.
3. **A reviewee marking someone else's reminder read** (an id from another account in the PATCH body). Expected: the other row is untouched and the caller's own unread count comes back. Pinned in Task 4 (`markNudgesRead` DB test).
4. **JSON after the move.** Roster rows keep `id, name, email, image, manager{id, name, email, role, image}, …`; managers keep `id, name, email, image, lastSeenAt, status, reviewees`; sent nudges keep `id, senderId, sender, message, createdAt, read`; the bell keeps `{nudges: [{id, sender, message, createdAt, read}], unread}`. Timestamps are ISO strings. Pinned by route tests (Tasks 2–4) and the parity script (Task 5).
5. **A presence stamp or audit write that fails.** Expected: logged and swallowed, so the roster, the removal or the avatar still answers. Pinned in Task 1 (DB tests feed a malformed id and assert the call resolves).

Also noted, not changed: two sends at once can both pass the four-hour cooldown and write two reminders (the check and the insert were never atomic); a malformed (non-UUID) id still raises a database error and a 500, as it did through `pg`; `LIMIT 20` lists order by `created_at DESC` with no tiebreak, as before.

---

## File Map

| Path | Responsibility |
| ---- | -------------- |
| `src/server/data/staff.ts` (+ `.db.test.ts`) | **Create.** Presence, audit, roster, managers, removal, nudges |
| `src/app/api/_lib/presence-store.ts`, `audit-store.ts` | **Delete** (moved into `staff.ts`) |
| `src/app/api/invites/route.ts`, `route.test.ts` | Modify: import `touchLastSeen` from `staff.ts` |
| `src/app/api/user/avatar/route.ts` | Modify: same |
| `src/app/api/auth/register/signup-link.db.test.ts` | Modify: mock path |
| `src/app/api/admin/reviewees/route.ts`, `route.test.ts` | Modify: `listReviewees` |
| `src/app/api/admin/managers/route.ts` (+ `route.test.ts`) | Modify / **Create** |
| `src/app/api/admin/reviewees/[id]/route.ts` (+ `route.test.ts`) | Modify / **Create** |
| `src/app/api/admin/reviewees/[id]/nudge/route.ts` (+ `route.test.ts`) | Modify / **Create** |
| `src/app/api/nudges/route.ts` (+ `route.test.ts`) | Modify / **Create** |
| `scripts/parity/staff-parity.ts`, `package.json` | **Create** / Modify: `pnpm parity:staff` |
| `docs/superpowers/specs/2026-10-14-prisma-migration-design.md` | Add "Wave 4 outcome" |

---

### Task 1: Presence and audit move into `staff.ts`

**Files:**
- Create: `src/server/data/staff.ts`, `src/server/data/staff.db.test.ts`
- Delete: `src/app/api/_lib/presence-store.ts`, `src/app/api/_lib/audit-store.ts`
- Modify (import path only): `src/app/api/invites/route.ts`, `src/app/api/invites/route.test.ts`, `src/app/api/user/avatar/route.ts`, `src/app/api/auth/register/signup-link.db.test.ts`, `src/app/api/admin/managers/route.ts`, `src/app/api/admin/reviewees/route.ts`, `src/app/api/admin/reviewees/route.test.ts`, `src/app/api/admin/reviewees/[id]/route.ts`, `src/app/api/admin/reviewees/[id]/nudge/route.ts`

**Interfaces:**
- Produces:
  - `touchLastSeen(userId: string): Promise<void>` — never throws.
  - `type AdminAction = "reviewee.removed" | "reviewee.restored"`
  - `recordAdminAction(entry: { actor: { id: string; email: string; role: string }; action: AdminAction; target: { id: string; email: string | null; name: string | null }; detail?: Record<string, unknown> }): Promise<void>` — never throws.

- [ ] **Step 1: Write the failing DB tests**

Create `src/server/data/staff.db.test.ts`:

```ts
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import prisma from "@/server/db/prisma";
import { createUser, deleteUsers } from "@/test/db-fixtures";
import { recordAdminAction, touchLastSeen } from "./staff";

const made: string[] = [];
afterAll(async () => {
  await prisma.adminAction.deleteMany({ where: { actorId: { in: made } } });
  await deleteUsers(...made);
});

async function user(overrides: Parameters<typeof createUser>[0] = {}) {
  const created = await createUser(overrides);
  made.push(created.id);
  return created;
}

/** Silences and captures console.error for one test. */
function quietErrors() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

describe("touchLastSeen", () => {
  it("stamps the account with the app's clock", async () => {
    const me = await user();
    const before = Date.now();

    await touchLastSeen(me.id);

    const { lastSeenAt } = await prisma.user.findUniqueOrThrow({
      where: { id: me.id },
      select: { lastSeenAt: true },
    });
    expect(lastSeenAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(lastSeenAt!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("does nothing, quietly, for an id nobody has", async () => {
    const errors = quietErrors();
    await expect(touchLastSeen(randomUUID())).resolves.toBeUndefined();
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("logs and swallows a database error", async () => {
    const errors = quietErrors();
    await expect(touchLastSeen("not-a-uuid")).resolves.toBeUndefined();
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});

describe("recordAdminAction", () => {
  it("writes who did what to whom, with the detail", async () => {
    const actor = await user({ role: "ADMIN" });
    const target = await user();

    await recordAdminAction({
      actor: { id: actor.id, email: actor.email, role: "ADMIN" },
      action: "reviewee.removed",
      target: { id: target.id, email: target.email, name: "Rae" },
      detail: { reason: "left the agency" },
    });

    const row = await prisma.adminAction.findFirstOrThrow({ where: { targetId: target.id } });
    expect(row).toMatchObject({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: "ADMIN",
      action: "reviewee.removed",
      targetId: target.id,
      targetEmail: target.email,
      targetName: "Rae",
      detail: { reason: "left the agency" },
    });
  });

  it("stores an empty detail when none is given", async () => {
    const actor = await user({ role: "MANAGER" });
    const target = await user();

    await recordAdminAction({
      actor: { id: actor.id, email: actor.email, role: "MANAGER" },
      action: "reviewee.removed",
      target: { id: target.id, email: null, name: null },
    });

    const row = await prisma.adminAction.findFirstOrThrow({ where: { targetId: target.id } });
    expect(row.detail).toEqual({});
    expect(row.targetEmail).toBeNull();
  });

  it("logs and swallows a failure", async () => {
    const errors = quietErrors();
    await expect(
      recordAdminAction({
        actor: { id: "not-a-uuid", email: "x@example.test", role: "ADMIN" },
        action: "reviewee.removed",
        target: { id: randomUUID(), email: null, name: null },
      }),
    ).resolves.toBeUndefined();
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test:db src/server/data/staff.db.test.ts`
Expected: FAIL — cannot resolve `./staff`.

- [ ] **Step 3: Create `staff.ts` with presence and audit**

Create `src/server/data/staff.ts` (the doc comments are the old stores', kept):

```ts
import "server-only";
import prisma from "@/server/db/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Staff: the console's roster and managers list, removing a reviewee,
 * nudges, the audit log and presence stamps. Every query on nudges and
 * admin_actions, and every staff read of users, goes through here.
 */

/**
 * Records that a staff account just loaded a screen.
 *
 * The avatar lookup behind AppNav is what every screen calls on load, so
 * stamping from the routes the app already hits answers "did they open it"
 * without the browser having to ping anything. What it marks is arrival, not
 * presence: a screen left open all morning still reads as the single visit
 * that loaded it.
 *
 * Callers pass the signed-in account and nothing else, so this can only ever
 * stamp whoever made the request.
 */
export async function touchLastSeen(userId: string): Promise<void> {
  try {
    // updateMany: an id that matches nothing is a no-op, as the old UPDATE
    // was, rather than a P2025.
    await prisma.user.updateMany({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
  } catch (error) {
    // Presence is a nicety on somebody else's screen. Losing a stamp must not
    // cost the caller the roster they actually asked for.
    console.error("Error recording last seen:", error);
  }
}

/**
 * A record of what a staff account did to a learner's account.
 *
 * Removal used to leave nothing behind: the row was deleted, everything
 * cascaded, and the question "who removed this person, and when" had no answer
 * in the database. Actions are written here first, and the actor's and target's
 * details are copied in at the time so the record still reads years later,
 * after either account has gone.
 *
 * Writing a record must never be the reason an action fails, so a failure here
 * is logged and swallowed. It is a record, not a gate.
 */
export type AdminAction = "reviewee.removed" | "reviewee.restored";

export async function recordAdminAction(entry: {
  actor: { id: string; email: string; role: string };
  action: AdminAction;
  target: { id: string; email: string | null; name: string | null };
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.adminAction.create({
      data: {
        actorId: entry.actor.id,
        actorEmail: entry.actor.email,
        actorRole: entry.actor.role,
        action: entry.action,
        targetId: entry.target.id,
        targetEmail: entry.target.email,
        targetName: entry.target.name,
        detail: (entry.detail ?? {}) as Prisma.InputJsonObject,
      },
    });
  } catch (error) {
    console.error("Failed to record admin action:", entry.action, error);
  }
}
```

- [ ] **Step 4: Run the DB tests to verify they pass**

Run: `pnpm test:db src/server/data/staff.db.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Repoint every caller and delete the two stores**

In each file below, change only the import (or mock) path; nothing else:

- `src/app/api/invites/route.ts`, `src/app/api/user/avatar/route.ts`, `src/app/api/admin/managers/route.ts`, `src/app/api/admin/reviewees/route.ts`, `src/app/api/admin/reviewees/[id]/nudge/route.ts`:
  `import { touchLastSeen } from "@/app/api/_lib/presence-store";` → `import { touchLastSeen } from "@/server/data/staff";`
- `src/app/api/admin/reviewees/[id]/route.ts`: replace the two `_lib` imports with
  `import { recordAdminAction, touchLastSeen } from "@/server/data/staff";`
- `src/app/api/invites/route.test.ts`, `src/app/api/admin/reviewees/route.test.ts`, `src/app/api/auth/register/signup-link.db.test.ts`:
  `vi.mock("@/app/api/_lib/presence-store", …)` → `vi.mock("@/server/data/staff", …)` with the same factory.

Then:

```bash
git rm src/app/api/_lib/presence-store.ts src/app/api/_lib/audit-store.ts
git grep -n "presence-store\|audit-store" -- src
```

Expected: the grep prints nothing.

- [ ] **Step 6: Verify**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:db`
Expected: all pass. If `tsc` fails on stale `.next/types` or `.next/dev/types`, delete those folders (Wave 1 and 2 outcomes).

- [ ] **Step 7: Commit**

```bash
git add -A src/server/data/staff.ts src/server/data/staff.db.test.ts src/app/api
git commit -m "refactor: stamp presence and write the audit log through the staff module"
```

---

### Task 2: Roster and managers lists read through `staff.ts`

**Files:**
- Modify: `src/server/data/staff.ts`, `src/server/data/staff.db.test.ts`
- Modify: `src/app/api/admin/reviewees/route.ts`, `src/app/api/admin/reviewees/route.test.ts`
- Modify: `src/app/api/admin/managers/route.ts`; Create: `src/app/api/admin/managers/route.test.ts`

**Interfaces:**
- Consumes: `touchLastSeen` (Task 1).
- Produces:
  - `type StaffRole = "USER" | "MANAGER" | "ADMIN"`
  - `type RosterReviewee = { id: string; email: string; name: string; image: string | null; manager: { id: string; name: string; email: string; role: StaffRole; image: string | null } | null }`
  - `listReviewees(recruitedBy: string | null): Promise<RosterReviewee[]>` — `null` means every reviewee (admin); an id means that manager's recruits. Ordered by name.
  - `type ManagerActivity = { id: string; name: string; email: string; image: string | null; lastSeenAt: Date | null; reviewees: number }`
  - `listManagers(): Promise<ManagerActivity[]>` — ordered by `lastSeenAt` desc, nulls last, then name.

- [ ] **Step 1: Write the failing DB tests**

Append to `src/server/data/staff.db.test.ts`, and add `listManagers, listReviewees` to its `./staff` import:

```ts
async function named(
  name: string,
  overrides: Parameters<typeof createUser>[0] = {},
  data: { deletedAt?: Date; lastSeenAt?: Date } = {},
) {
  const created = await user(overrides);
  await prisma.user.update({ where: { id: created.id }, data: { name, ...data } });
  return { ...created, name };
}

const mine = <T extends { id: string }>(rows: T[]) => rows.filter((r) => made.includes(r.id));

describe("listReviewees", () => {
  it("gives a manager their own active reviewees, by name", async () => {
    const boss = await named("Boss", { role: "MANAGER" });
    const other = await named("Other", { role: "MANAGER" });
    const zed = await named("Zed", { managerId: boss.id });
    const amy = await named("Amy", { managerId: boss.id });
    await named("Gone", { managerId: boss.id }, { deletedAt: new Date() });
    await named("Staff", { role: "MANAGER", managerId: boss.id });
    await named("Theirs", { managerId: other.id });

    const rows = await listReviewees(boss.id);

    expect(rows.map((r) => r.id)).toEqual([amy.id, zed.id]);
    expect(rows[0]).toEqual({
      id: amy.id,
      email: amy.email,
      name: "Amy",
      image: null,
      manager: { id: boss.id, name: "Boss", email: boss.email, role: "MANAGER", image: null },
    });
  });

  it("gives an admin every reviewee, recruited or not", async () => {
    const boss = await named("Boss", { role: "MANAGER" });
    const recruited = await named("Recruited", { managerId: boss.id });
    const walkIn = await named("Walk-in");

    const rows = mine(await listReviewees(null));

    expect(rows.find((r) => r.id === recruited.id)!.manager!.id).toBe(boss.id);
    expect(rows.find((r) => r.id === walkIn.id)!.manager).toBeNull();
  });

  it("still names a recruiter who has since been removed", async () => {
    const boss = await named("Former", { role: "MANAGER" }, { deletedAt: new Date() });
    const kept = await named("Kept", { managerId: boss.id });

    const [row] = mine(await listReviewees(null)).filter((r) => r.id === kept.id);
    expect(row.manager).toMatchObject({ id: boss.id, name: "Former" });
  });
});

describe("listManagers", () => {
  it("counts each manager's active reviewees and orders by last seen, never-seen last", async () => {
    const early = await named("Early", { role: "MANAGER" }, { lastSeenAt: new Date("2026-10-01T00:00:00Z") });
    const late = await named("Late", { role: "MANAGER" }, { lastSeenAt: new Date("2026-10-10T00:00:00Z") });
    const never = await named("Never", { role: "MANAGER" });
    await named("R1", { managerId: early.id });
    await named("R2", { managerId: early.id });
    await named("Removed", { managerId: early.id }, { deletedAt: new Date() });
    await named("Staff recruit", { role: "MANAGER", managerId: early.id });
    await named("Gone manager", { role: "MANAGER" }, { deletedAt: new Date() });
    await named("An admin", { role: "ADMIN" });

    const rows = mine(await listManagers());

    // Other managers made by earlier tests are interleaved; check these three.
    expect(
      rows.filter((r) => [early.id, late.id, never.id].includes(r.id)).map((r) => r.name),
    ).toEqual(["Late", "Early", "Never"]);
    expect(rows.find((r) => r.id === early.id)).toEqual({
      id: early.id,
      name: "Early",
      email: early.email,
      image: null,
      lastSeenAt: new Date("2026-10-01T00:00:00Z"),
      reviewees: 2,
    });
    expect(rows.find((r) => r.id === never.id)!.lastSeenAt).toBeNull();
    expect(rows.find((r) => r.id === late.id)!.reviewees).toBe(0);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test:db src/server/data/staff.db.test.ts`
Expected: FAIL — `listReviewees` / `listManagers` is not exported.

- [ ] **Step 3: Implement the two reads**

Append to `src/server/data/staff.ts`:

```ts
export type StaffRole = "USER" | "MANAGER" | "ADMIN";

export type RosterReviewee = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  manager: {
    id: string;
    name: string;
    email: string;
    role: StaffRole;
    image: string | null;
  } | null;
};

/**
 * Active reviewees for the roster, by name. recruitedBy null is everyone
 * (an admin's view); an id is that manager's own recruits. manager_id is set
 * at signup from the invite used, so it is the recruiter. The recruiter is
 * read even if since removed, as the old LEFT JOIN did.
 */
export async function listReviewees(
  recruitedBy: string | null,
): Promise<RosterReviewee[]> {
  return prisma.user.findMany({
    where: {
      role: "USER",
      deletedAt: null,
      ...(recruitedBy === null ? {} : { managerId: recruitedBy }),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      manager: {
        select: { id: true, name: true, email: true, role: true, image: true },
      },
    },
  });
}

export type ManagerActivity = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  lastSeenAt: Date | null;
  reviewees: number;
};

/**
 * Active unit managers, most recently seen first (never seen last, then by
 * name), each with how many active reviewees they recruited.
 */
export async function listManagers(): Promise<ManagerActivity[]> {
  const rows = await prisma.user.findMany({
    where: { role: "MANAGER", deletedAt: null },
    orderBy: [{ lastSeenAt: { sort: "desc", nulls: "last" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      lastSeenAt: true,
      _count: {
        select: { recruits: { where: { role: "USER", deletedAt: null } } },
      },
    },
  });
  return rows.map(({ _count, ...row }) => ({ ...row, reviewees: _count.recruits }));
}
```

- [ ] **Step 4: Run the DB tests to verify they pass**

Run: `pnpm test:db src/server/data/staff.db.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing route tests**

Replace `src/app/api/admin/reviewees/route.test.ts` with:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, listReviewees, getTrackCountsFor, touchLastSeen } = vi.hoisted(() => ({
  auth: vi.fn(),
  listReviewees: vi.fn(),
  getTrackCountsFor: vi.fn(),
  touchLastSeen: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/mastery", () => ({ getTrackCountsFor }));
vi.mock("@/server/data/staff", () => ({ listReviewees, touchLastSeen }));

import { buildTrackCounts, type ProgressRow } from "@/lib/helper/track-counts";
import { examTypes, type ExamType } from "@/lib/types/common";
import { GET } from "./route";

const reviewee = { id: "r1", email: "r@example.test", name: "Rae", image: null, manager: null };

const progress = (exam_type: string, last_answer_at: Date | null): ProgressRow => ({
  user_id: "r1", exam_type, flashcards_mastered: 1, memorization_mastered: 1,
  memorization_answered: 2, memorization_correct: 1, questions_mastered: 0,
  attempts_taken: 1, passing_attempts: 1, last_reviewed_at: null, last_answer_at,
});

const totals = (exam_type: string) => ({
  exam_type, flashcards: 1, memorization: 1, questions: 1,
});

const roster = async (query = "") =>
  (await GET(new Request(`http://internal.local/api/admin/reviewees${query}`))).json();

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
  listReviewees.mockResolvedValue([reviewee]);
  getTrackCountsFor.mockResolvedValue(new Map([["r1", []]]));
});

describe("GET /api/admin/reviewees", () => {
  it("scores each track from the mastery module", async () => {
    getTrackCountsFor.mockImplementation(async (ids: string[], tracks: ExamType[]) =>
      new Map([[ids[0], tracks.map((t) => buildTrackCounts(t, totals(t), progress(t, null)))]]),
    );
    const [row] = await roster();

    expect(getTrackCountsFor).toHaveBeenCalledWith(["r1"], examTypes);
    // each track: 100 + 100 + 0 → 67
    expect(row.readiness).toBe(67);
    expect(row.byExam).toHaveLength(4);
    expect(row.memorize).toEqual({ total: 4, mastered: 4, accuracy: 50 });
    expect(row.practiceExam.tracks[0]).toEqual({
      examType: "VUL", taken: 1, passes: 1, required: 5, passed: false,
    });
  });

  it("reports the most recent activity, not the alphabetically last weekday", async () => {
    const wednesday = new Date("2026-10-14T09:00:00Z");
    const thursday = new Date("2026-10-15T09:00:00Z");
    getTrackCountsFor.mockResolvedValue(
      new Map([["r1", [
        buildTrackCounts("VUL", totals("VUL"), progress("VUL", thursday)),
        buildTrackCounts("TRADITIONAL_LIFE", totals("TRADITIONAL_LIFE"), progress("TRADITIONAL_LIFE", wednesday)),
      ]]]),
    );
    const [row] = await roster();
    expect(row.activity.lastActivity).toBe(thursday.toISOString());
  });

  it("narrows to one track with ?exam_type", async () => {
    await roster("?exam_type=IIAP_A");
    expect(getTrackCountsFor).toHaveBeenCalledWith(["r1"], ["IIAP_A"]);
  });

  it("lists every reviewee for an admin and only their own for a manager", async () => {
    await roster();
    expect(listReviewees).toHaveBeenLastCalledWith(null);

    auth.mockResolvedValue({ user: { id: "m1", role: "MANAGER" } });
    await roster();
    expect(listReviewees).toHaveBeenLastCalledWith("m1");
  });

  it("keeps the row's leading keys and the manager object in order", async () => {
    listReviewees.mockResolvedValue([{
      ...reviewee,
      manager: { id: "m1", name: "Mae", email: "m@example.test", role: "MANAGER", image: null },
    }]);
    const [row] = await roster();

    expect(Object.keys(row).slice(0, 5)).toEqual(["id", "name", "email", "image", "manager"]);
    expect(JSON.stringify(row.manager)).toBe(
      JSON.stringify({ id: "m1", name: "Mae", email: "m@example.test", role: "MANAGER", image: null }),
    );
  });

  it("answers an empty roster without reading counts", async () => {
    listReviewees.mockResolvedValue([]);
    expect(await roster()).toEqual([]);
    expect(getTrackCountsFor).not.toHaveBeenCalled();
  });

  it("refuses a reviewee", async () => {
    auth.mockResolvedValue({ user: { id: "r1", role: "USER" } });
    const response = await GET(new Request("http://internal.local/api/admin/reviewees"));
    expect(response.status).toBe(403);
    expect(listReviewees).not.toHaveBeenCalled();
  });
});
```

Create `src/app/api/admin/managers/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, listManagers, touchLastSeen } = vi.hoisted(() => ({
  auth: vi.fn(),
  listManagers: vi.fn(),
  touchLastSeen: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/staff", () => ({ listManagers, touchLastSeen }));

import { presenceStatus } from "@/lib/helper/presence";
import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
});

describe("GET /api/admin/managers", () => {
  it("answers 401 signed out and 403 for a manager", async () => {
    auth.mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(401);

    auth.mockResolvedValueOnce({ user: { id: "m1", role: "MANAGER" } });
    expect((await GET()).status).toBe(403);
    expect(listManagers).not.toHaveBeenCalled();
  });

  it("returns each manager in today's shape, stamping the admin", async () => {
    const seen = new Date(Date.now() - 5 * 60_000);
    listManagers.mockResolvedValue([
      { id: "m1", name: "Mae", email: "m@example.test", image: null, lastSeenAt: seen, reviewees: 3 },
      { id: "m2", name: "Max", email: "x@example.test", image: "data:image/png;base64,AA==", lastSeenAt: null, reviewees: 0 },
    ]);

    const response = await GET();

    expect(touchLastSeen).toHaveBeenCalledWith("admin");
    expect(JSON.stringify(await response.json())).toBe(JSON.stringify([
      { id: "m1", name: "Mae", email: "m@example.test", image: null, lastSeenAt: seen.toISOString(), status: presenceStatus(seen.toISOString()), reviewees: 3 },
      { id: "m2", name: "Max", email: "x@example.test", image: "data:image/png;base64,AA==", lastSeenAt: null, status: presenceStatus(null), reviewees: 0 },
    ]));
  });

  it("answers 500 when the read fails", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    listManagers.mockRejectedValue(new Error("down"));
    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to fetch managers" });
    errors.mockRestore();
  });
});
```

- [ ] **Step 6: Run them to verify they fail**

Run: `pnpm test src/app/api/admin/reviewees/route.test.ts src/app/api/admin/managers/route.test.ts`
Expected: FAIL — the routes still call `pool.query`, which is unmocked.

- [ ] **Step 7: Switch the two routes**

In `src/app/api/admin/reviewees/route.ts`:
- Remove `import pool from "@/lib/db";`; import `listReviewees` alongside `touchLastSeen` from `@/server/data/staff`.
- Replace the `selectReviewees` string, the `usersResult` query and `const users = usersResult.rows;` with:

```ts
    // manager_id is set at signup from the invite the reviewee used, so it is
    // the recruiter. An admin sees every reviewee and who recruited them; a
    // manager sees only the reviewees they recruited themselves.
    const users = await listReviewees(role === "ADMIN" ? null : currentUserId);
    if (users.length === 0) return NextResponse.json([]);
```

- Replace the `manager:` property in the returned row with:

```ts
        // Null when the account predates invite-only signup.
        manager: user.manager
          ? {
              id: user.manager.id,
              name: user.manager.name,
              email: user.manager.email,
              role: user.manager.role as "ADMIN" | "MANAGER",
              image: user.manager.image ?? null,
            }
          : null,
```

In `src/app/api/admin/managers/route.ts`:
- Remove `import pool from "@/lib/db";`; import `listManagers` alongside `touchLastSeen` from `@/server/data/staff`.
- Replace the body of the `try` with:

```ts
    const managers = (await listManagers()).map((row) => {
      // Settling on an ISO string here keeps the shape the same whether a
      // caller reads it or JSON does.
      const lastSeenAt = row.lastSeenAt ? row.lastSeenAt.toISOString() : null;

      return {
        id: row.id,
        name: row.name,
        email: row.email,
        image: row.image ?? null,
        // Null for an account that has not made a request since the column
        // was added, which reads the same as never having opened the app.
        lastSeenAt,
        status: presenceStatus(lastSeenAt),
        reviewees: row.reviewees,
      };
    });

    return NextResponse.json(managers);
```

- [ ] **Step 8: Run the route tests to verify they pass**

Run: `pnpm test src/app/api/admin/reviewees/route.test.ts src/app/api/admin/managers/route.test.ts`
Expected: PASS.

- [ ] **Step 9: Verify and commit**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:db` → all pass.

```bash
git add src/server/data/staff.ts src/server/data/staff.db.test.ts src/app/api/admin/reviewees/route.ts src/app/api/admin/reviewees/route.test.ts src/app/api/admin/managers
git commit -m "refactor: read the roster and the managers list through the staff module"
```

---

### Task 3: Removing a reviewee through `staff.ts`

**Files:**
- Modify: `src/server/data/staff.ts`, `src/server/data/staff.db.test.ts`
- Modify: `src/app/api/admin/reviewees/[id]/route.ts`; Create: `src/app/api/admin/reviewees/[id]/route.test.ts`

**Interfaces:**
- Consumes: `touchLastSeen`, `recordAdminAction`, `StaffRole` (Tasks 1–2).
- Produces:
  - `type StaffTarget = { id: string; name: string; email: string; role: StaffRole; managerId: string | null }`
  - `findActiveAccount(id: string): Promise<StaffTarget | null>` — `null` for an unknown or removed account. Also used by Task 4.
  - `removeReviewee(id: string): Promise<boolean>` — stamps `deleted_at`; `true` only if this call stamped it.

- [ ] **Step 1: Write the failing DB tests**

Append to `src/server/data/staff.db.test.ts`, adding `findActiveAccount, removeReviewee` to the import:

```ts
describe("findActiveAccount", () => {
  it("reads what a staff action checks, and nothing for a removed account", async () => {
    const boss = await user({ role: "MANAGER" });
    const me = await named("Rae", { managerId: boss.id });

    expect(await findActiveAccount(me.id)).toEqual({
      id: me.id, name: "Rae", email: me.email, role: "USER", managerId: boss.id,
    });

    await prisma.user.update({ where: { id: me.id }, data: { deletedAt: new Date() } });
    expect(await findActiveAccount(me.id)).toBeNull();
    expect(await findActiveAccount(randomUUID())).toBeNull();
  });
});

describe("removeReviewee", () => {
  it("stamps deleted_at once and reports whether this call did it", async () => {
    const me = await user();
    const before = Date.now();

    expect(await removeReviewee(me.id)).toBe(true);
    const { deletedAt } = await prisma.user.findUniqueOrThrow({
      where: { id: me.id },
      select: { deletedAt: true },
    });
    expect(deletedAt!.getTime()).toBeGreaterThanOrEqual(before);

    expect(await removeReviewee(me.id)).toBe(false);
    const again = await prisma.user.findUniqueOrThrow({
      where: { id: me.id },
      select: { deletedAt: true },
    });
    expect(again.deletedAt).toEqual(deletedAt);
  });

  it("lets only one of two simultaneous removals claim it", async () => {
    const me = await user();
    const results = await Promise.all([removeReviewee(me.id), removeReviewee(me.id)]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("keeps everything the reviewee did", async () => {
    const me = await user();
    await prisma.studyStreak.create({ data: { userId: me.id, examType: "VUL" } });
    await removeReviewee(me.id);
    expect(await prisma.studyStreak.count({ where: { userId: me.id } })).toBe(1);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test:db src/server/data/staff.db.test.ts`
Expected: FAIL — not exported.

- [ ] **Step 3: Implement**

Append to `src/server/data/staff.ts`:

```ts
export type StaffTarget = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  managerId: string | null;
};

/** The account a staff action is aimed at, or null if unknown or removed. */
export async function findActiveAccount(id: string): Promise<StaffTarget | null> {
  return prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, name: true, email: true, role: true, managerId: true },
  });
}

/**
 * Removes a reviewee: a soft delete that stamps deleted_at. Every read
 * filters on it, and their work stays, so they can be restored.
 *
 * True only if this call did the stamping. Of two removals racing, one gets
 * true; the caller writes the audit record only then.
 */
export async function removeReviewee(id: string): Promise<boolean> {
  const { count } = await prisma.user.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return count === 1;
}
```

- [ ] **Step 4: Run the DB tests to verify they pass**

Run: `pnpm test:db src/server/data/staff.db.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing route test**

Create `src/app/api/admin/reviewees/[id]/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, findActiveAccount, removeReviewee, recordAdminAction, touchLastSeen } =
  vi.hoisted(() => ({
    auth: vi.fn(),
    findActiveAccount: vi.fn(),
    removeReviewee: vi.fn(),
    recordAdminAction: vi.fn(),
    touchLastSeen: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/staff", () => ({
  findActiveAccount, removeReviewee, recordAdminAction, touchLastSeen,
}));

import { DELETE } from "./route";

const target = { id: "r1", name: "Rae", email: "r@example.test", role: "USER", managerId: "m1" };

async function remove(id = "r1") {
  const response = await DELETE(new Request(`http://internal.local/api/admin/reviewees/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  });
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "admin", role: "ADMIN", email: "a@example.test" } });
  findActiveAccount.mockResolvedValue(target);
  removeReviewee.mockResolvedValue(true);
});

describe("DELETE /api/admin/reviewees/[id]", () => {
  it("removes the reviewee, records it and answers in today's shape", async () => {
    const { status, body } = await remove();

    expect(status).toBe(200);
    expect(JSON.stringify(body)).toBe(JSON.stringify({ message: "Rae has been removed.", id: "r1" }));
    expect(removeReviewee).toHaveBeenCalledWith("r1");
    expect(recordAdminAction).toHaveBeenCalledWith({
      actor: { id: "admin", email: "a@example.test", role: "ADMIN" },
      action: "reviewee.removed",
      target: { id: "r1", email: "r@example.test", name: "Rae" },
    });
  });

  it("answers the same when another request removed them first, without a second record", async () => {
    removeReviewee.mockResolvedValue(false);
    const { status, body } = await remove();

    expect(status).toBe(200);
    expect(body).toEqual({ message: "Rae has been removed.", id: "r1" });
    expect(recordAdminAction).not.toHaveBeenCalled();
  });

  it("refuses the caller's own account", async () => {
    const { status, body } = await remove("admin");
    expect(status).toBe(400);
    expect(body).toEqual({ error: "You cannot remove your own account." });
  });

  it("answers 404 for an account that is gone", async () => {
    findActiveAccount.mockResolvedValue(null);
    const { status, body } = await remove();
    expect(status).toBe(404);
    expect(body).toEqual({ error: "That reviewee no longer exists." });
  });

  it("refuses staff accounts", async () => {
    findActiveAccount.mockResolvedValue({ ...target, role: "MANAGER" });
    const { status, body } = await remove();
    expect(status).toBe(403);
    expect(body).toEqual({ error: "Only reviewee accounts can be removed here." });
    expect(removeReviewee).not.toHaveBeenCalled();
  });

  it("lets a manager remove only their own reviewees", async () => {
    auth.mockResolvedValue({ user: { id: "m2", role: "MANAGER", email: "m2@example.test" } });
    const refused = await remove();
    expect(refused.status).toBe(403);
    expect(refused.body).toEqual({ error: "You can only remove reviewees you manage." });
    expect(removeReviewee).not.toHaveBeenCalled();

    auth.mockResolvedValue({ user: { id: "m1", role: "MANAGER", email: "m1@example.test" } });
    expect((await remove()).status).toBe(200);
  });

  it("answers 401 signed out and 403 for a reviewee", async () => {
    auth.mockResolvedValueOnce(null);
    expect((await remove()).status).toBe(401);
    auth.mockResolvedValueOnce({ user: { id: "r9", role: "USER" } });
    expect((await remove()).status).toBe(403);
  });

  it("answers 500 when the removal fails", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    removeReviewee.mockRejectedValue(new Error("down"));
    const { status, body } = await remove();
    expect(status).toBe(500);
    expect(body).toEqual({ error: "Failed to remove reviewee" });
    errors.mockRestore();
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `pnpm test "src/app/api/admin/reviewees/\[id\]/route.test.ts"`
Expected: FAIL — the route still calls `pool.query`.

- [ ] **Step 7: Switch the route**

In `src/app/api/admin/reviewees/[id]/route.ts`:
- Remove `import pool from "@/lib/db";`; import `findActiveAccount, recordAdminAction, removeReviewee, touchLastSeen` from `@/server/data/staff`.
- Update the doc comment's first paragraph to say what the route does today:

```ts
/**
 * Removes a reviewee. A soft delete: deleted_at is stamped, every read
 * filters on it, and their progress, attempts and streaks stay so they can
 * be restored.
 *
 * Deliberately narrow: only USER accounts can be removed, an admin cannot
 * delete themselves, and a manager can only remove their own reports.
 */
```

- Replace the `target` query and `const user = target.rows[0];` with `const user = await findActiveAccount(id);`.
- Replace `user.manager_id !== currentUserId` with `user.managerId !== currentUserId`.
- Replace the `UPDATE` and the `recordAdminAction` call with:

```ts
    // Two removals racing both get here; only the one that stamped the row
    // records it, so the audit log says it once.
    if (await removeReviewee(id)) {
      await recordAdminAction({
        actor: {
          id: currentUserId,
          email: session.user.email ?? "unknown",
          role,
        },
        action: "reviewee.removed",
        target: { id: user.id, email: user.email, name: user.name },
      });
    }
```

- [ ] **Step 8: Run the route test to verify it passes**

Run: `pnpm test "src/app/api/admin/reviewees/\[id\]/route.test.ts"`
Expected: PASS.

- [ ] **Step 9: Verify and commit**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:db` → all pass.

```bash
git add src/server/data/staff.ts src/server/data/staff.db.test.ts "src/app/api/admin/reviewees/[id]/route.ts" "src/app/api/admin/reviewees/[id]/route.test.ts"
git commit -m "refactor: remove a reviewee through the staff module, recording it once"
```

---

### Task 4: Nudges through `staff.ts`

**Files:**
- Modify: `src/server/data/staff.ts`, `src/server/data/staff.db.test.ts`
- Modify: `src/app/api/admin/reviewees/[id]/nudge/route.ts`; Create: `src/app/api/admin/reviewees/[id]/nudge/route.test.ts`
- Modify: `src/app/api/nudges/route.ts`; Create: `src/app/api/nudges/route.test.ts`

**Interfaces:**
- Consumes: `touchLastSeen`, `findActiveAccount` (Tasks 1, 3).
- Produces:
  - `type NudgeRecord = { id: string; senderId: string | null; senderName: string; message: string; createdAt: Date; readAt: Date | null }`
  - `lastNudgeSentAt(userId: string, senderId: string): Promise<Date | null>`
  - `sendNudge(input: { userId: string; senderId: string; senderName: string; message: string }): Promise<NudgeRecord>`
  - `listNudges(userId: string, limit: number): Promise<NudgeRecord[]>` — newest first.
  - `findNudge(id: string, userId: string): Promise<{ id: string; senderId: string | null } | null>`
  - `deleteNudge(id: string): Promise<void>` — no-op if already gone.
  - `unreadNudgeCount(userId: string): Promise<number>`
  - `markNudgesRead(userId: string, id: string | null): Promise<void>` — one (when `id`) or all; only the user's own unread rows.

- [ ] **Step 1: Write the failing DB tests**

Append to `src/server/data/staff.db.test.ts`, adding `deleteNudge, findNudge, lastNudgeSentAt, listNudges, markNudgesRead, sendNudge, unreadNudgeCount` to the import:

```ts
describe("nudges", () => {
  async function pair() {
    const boss = await user({ role: "MANAGER" });
    const me = await user({ managerId: boss.id });
    return { boss, me };
  }

  const nudge = (userId: string, senderId: string, createdAt: Date, message = "Keep going") =>
    prisma.nudge.create({
      data: { userId, senderId, senderName: "Boss", message, createdAt },
      select: { id: true },
    });

  it("sends one and reads it back as sent", async () => {
    const { boss, me } = await pair();
    const before = Date.now();

    const sent = await sendNudge({ userId: me.id, senderId: boss.id, senderName: "Boss", message: "Keep going" });

    expect(sent).toMatchObject({ senderId: boss.id, senderName: "Boss", message: "Keep going", readAt: null });
    expect(sent.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(await lastNudgeSentAt(me.id, boss.id)).toEqual(sent.createdAt);
  });

  it("times the cooldown per sender", async () => {
    const { boss, me } = await pair();
    const other = await user({ role: "ADMIN" });
    await nudge(me.id, boss.id, new Date("2026-10-01T00:00:00Z"));
    await nudge(me.id, boss.id, new Date("2026-10-02T00:00:00Z"));
    await nudge(me.id, other.id, new Date("2026-10-03T00:00:00Z"));

    expect(await lastNudgeSentAt(me.id, boss.id)).toEqual(new Date("2026-10-02T00:00:00Z"));
    expect(await lastNudgeSentAt(boss.id, me.id)).toBeNull();
  });

  it("lists newest first, capped", async () => {
    const { boss, me } = await pair();
    const old = await nudge(me.id, boss.id, new Date("2026-10-01T00:00:00Z"));
    const mid = await nudge(me.id, boss.id, new Date("2026-10-02T00:00:00Z"));
    const recent = await nudge(me.id, boss.id, new Date("2026-10-03T00:00:00Z"));

    expect((await listNudges(me.id, 2)).map((n) => n.id)).toEqual([recent.id, mid.id]);
    expect((await listNudges(me.id, 20)).map((n) => n.id)).toEqual([recent.id, mid.id, old.id]);
  });

  it("finds a nudge only under its own reviewee, and deletes it once", async () => {
    const { boss, me } = await pair();
    const stranger = await user();
    const sent = await nudge(me.id, boss.id, new Date());

    expect(await findNudge(sent.id, me.id)).toEqual({ id: sent.id, senderId: boss.id });
    expect(await findNudge(sent.id, stranger.id)).toBeNull();

    await deleteNudge(sent.id);
    await expect(deleteNudge(sent.id)).resolves.toBeUndefined();
    expect(await findNudge(sent.id, me.id)).toBeNull();
  });

  it("marks one read, then the rest, and never another account's", async () => {
    const { boss, me } = await pair();
    const neighbour = await user({ managerId: boss.id });
    const a = await nudge(me.id, boss.id, new Date("2026-10-01T00:00:00Z"));
    await nudge(me.id, boss.id, new Date("2026-10-02T00:00:00Z"));
    const theirs = await nudge(neighbour.id, boss.id, new Date());

    expect(await unreadNudgeCount(me.id)).toBe(2);

    await markNudgesRead(me.id, a.id);
    expect(await unreadNudgeCount(me.id)).toBe(1);
    const { readAt: firstRead } = await prisma.nudge.findUniqueOrThrow({ where: { id: a.id } });

    await markNudgesRead(me.id, theirs.id);
    expect(await unreadNudgeCount(neighbour.id)).toBe(1);

    await markNudgesRead(me.id, null);
    expect(await unreadNudgeCount(me.id)).toBe(0);
    // Already-read rows keep the time they were first read.
    const { readAt } = await prisma.nudge.findUniqueOrThrow({ where: { id: a.id } });
    expect(readAt).toEqual(firstRead);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm test:db src/server/data/staff.db.test.ts`
Expected: FAIL — not exported.

- [ ] **Step 3: Implement**

Append to `src/server/data/staff.ts`:

```ts
export type NudgeRecord = {
  id: string;
  senderId: string | null;
  senderName: string;
  message: string;
  createdAt: Date;
  readAt: Date | null;
};

const nudgeSelect = {
  id: true,
  senderId: true,
  senderName: true,
  message: true,
  createdAt: true,
  readAt: true,
} as const;

/** When this sender last reminded this reviewee, for the cooldown. */
export async function lastNudgeSentAt(
  userId: string,
  senderId: string,
): Promise<Date | null> {
  const last = await prisma.nudge.findFirst({
    where: { userId, senderId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return last?.createdAt ?? null;
}

/** Writes one reminder. The row is the record that it was sent. */
export async function sendNudge(input: {
  userId: string;
  senderId: string;
  senderName: string;
  message: string;
}): Promise<NudgeRecord> {
  return prisma.nudge.create({ data: input, select: nudgeSelect });
}

/** A reviewee's reminders, newest first. */
export async function listNudges(userId: string, limit: number): Promise<NudgeRecord[]> {
  return prisma.nudge.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: nudgeSelect,
  });
}

/** One reminder, only if it was sent to userId. */
export async function findNudge(
  id: string,
  userId: string,
): Promise<{ id: string; senderId: string | null } | null> {
  return prisma.nudge.findFirst({
    where: { id, userId },
    select: { id: true, senderId: true },
  });
}

/** Takes a reminder back. Already gone is not an error. */
export async function deleteNudge(id: string): Promise<void> {
  await prisma.nudge.deleteMany({ where: { id } });
}

/** Unread reminders across every row, not just the ones a list returns. */
export async function unreadNudgeCount(userId: string): Promise<number> {
  return prisma.nudge.count({ where: { userId, readAt: null } });
}

/**
 * Marks reminders read: the one named, or all of them. Matched only inside
 * userId's own unread rows, so naming somebody else's touches nothing.
 */
export async function markNudgesRead(userId: string, id: string | null): Promise<void> {
  await prisma.nudge.updateMany({
    where: { userId, readAt: null, ...(id === null ? {} : { id }) },
    data: { readAt: new Date() },
  });
}
```

- [ ] **Step 4: Run the DB tests to verify they pass**

Run: `pnpm test:db src/server/data/staff.db.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing route tests**

Create `src/app/api/admin/reviewees/[id]/nudge/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const staff = vi.hoisted(() => ({
  touchLastSeen: vi.fn(),
  findActiveAccount: vi.fn(),
  lastNudgeSentAt: vi.fn(),
  sendNudge: vi.fn(),
  listNudges: vi.fn(),
  findNudge: vi.fn(),
  deleteNudge: vi.fn(),
}));
const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/staff", () => staff);

import { nudgePresets } from "@/lib/helper/nudges";
import { DELETE, GET, POST } from "./route";

const reviewee = { id: "r1", name: "Rae", email: "r@example.test", role: "USER", managerId: "m1" };
const params = { params: Promise.resolve({ id: "r1" }) };
const url = "http://internal.local/api/admin/reviewees/r1/nudge";
const created = new Date("2026-10-14T09:00:00.000Z");

const record = (over: Partial<Record<string, unknown>> = {}) => ({
  id: "n1", senderId: "m1", senderName: "Mae", message: "Keep going",
  createdAt: created, readAt: null, ...over,
});

const read = async (response: Response) => ({ status: response.status, body: await response.json() });
const post = (body: unknown) =>
  POST(new Request(url, { method: "POST", body: JSON.stringify(body) }), params).then(read);

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "m1", role: "MANAGER", name: "Mae" } });
  staff.findActiveAccount.mockResolvedValue(reviewee);
  staff.lastNudgeSentAt.mockResolvedValue(null);
  staff.sendNudge.mockResolvedValue(record());
  staff.listNudges.mockResolvedValue([record(), record({ id: "n0", readAt: created })]);
  staff.findNudge.mockResolvedValue({ id: "n1", senderId: "m1" });
});

describe("POST /api/admin/reviewees/[id]/nudge", () => {
  it("sends a preset and answers in today's shape", async () => {
    const preset = nudgePresets[0];
    staff.sendNudge.mockResolvedValue(record({ message: preset.message }));

    const { status, body } = await post({ preset: preset.id });

    expect(status).toBe(200);
    expect(staff.sendNudge).toHaveBeenCalledWith({
      userId: "r1", senderId: "m1", senderName: "Mae", message: preset.message,
    });
    expect(JSON.stringify(body)).toBe(JSON.stringify({
      message: "Reminder sent to Rae.",
      nudge: { id: "n1", senderId: "m1", sender: "Mae", message: preset.message, createdAt: created.toISOString(), read: false },
    }));
  });

  it("signs as 'Your manager' when the session has no name", async () => {
    auth.mockResolvedValue({ user: { id: "m1", role: "MANAGER", name: null } });
    await post({ message: "Hello" });
    expect(staff.sendNudge).toHaveBeenCalledWith(expect.objectContaining({ senderName: "Your manager" }));
  });

  it("refuses a second reminder inside the cooldown", async () => {
    staff.lastNudgeSentAt.mockResolvedValue(new Date(Date.now() - 60_000));
    const { status, body } = await post({ message: "Hello" });
    expect(status).toBe(429);
    expect(body.error).toMatch(/^You have already reminded Rae\./);
    expect(staff.sendNudge).not.toHaveBeenCalled();
  });

  it("asks the cooldown of this sender for this reviewee", async () => {
    await post({ message: "Hello" });
    expect(staff.lastNudgeSentAt).toHaveBeenCalledWith("r1", "m1");
  });

  it("answers 400 for an empty body", async () => {
    const { status } = await post({});
    expect(status).toBe(400);
    expect(staff.sendNudge).not.toHaveBeenCalled();
  });

  it("refuses another manager's reviewee and a gone one", async () => {
    staff.findActiveAccount.mockResolvedValue({ ...reviewee, managerId: "m2" });
    const refused = await post({ message: "Hello" });
    expect(refused.status).toBe(403);
    expect(refused.body).toEqual({ error: "You can only remind reviewees you manage." });

    staff.findActiveAccount.mockResolvedValue(null);
    const gone = await post({ message: "Hello" });
    expect(gone.status).toBe(404);
    expect(gone.body).toEqual({ error: "That reviewee no longer exists." });
    expect(staff.sendNudge).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/reviewees/[id]/nudge", () => {
  it("lists the last twenty sent, with the viewer", async () => {
    const { status, body } = await read(await GET(new Request(url), params));

    expect(status).toBe(200);
    expect(staff.listNudges).toHaveBeenCalledWith("r1", 20);
    expect(JSON.stringify(body)).toBe(JSON.stringify({
      nudges: [
        { id: "n1", senderId: "m1", sender: "Mae", message: "Keep going", createdAt: created.toISOString(), read: false },
        { id: "n0", senderId: "m1", sender: "Mae", message: "Keep going", createdAt: created.toISOString(), read: true },
      ],
      viewer: { id: "m1", role: "MANAGER" },
    }));
  });

  it("refuses another manager's reviewee", async () => {
    staff.findActiveAccount.mockResolvedValue({ ...reviewee, managerId: "m2" });
    expect((await GET(new Request(url), params)).status).toBe(403);
    expect(staff.listNudges).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/admin/reviewees/[id]/nudge", () => {
  const remove = (query = "?nudge=n1") =>
    DELETE(new Request(`${url}${query}`, { method: "DELETE" }), params).then(read);

  it("takes back the sender's own reminder", async () => {
    const { status, body } = await remove();
    expect(status).toBe(200);
    expect(JSON.stringify(body)).toBe(JSON.stringify({ message: "Reminder deleted.", id: "n1" }));
    expect(staff.findNudge).toHaveBeenCalledWith("n1", "r1");
    expect(staff.deleteNudge).toHaveBeenCalledWith("n1");
  });

  it("needs a reminder named", async () => {
    expect(await remove("")).toEqual({ status: 400, body: { error: "Name the reminder to delete." } });
  });

  it("answers 404 for a reminder that is gone", async () => {
    staff.findNudge.mockResolvedValue(null);
    expect(await remove()).toEqual({ status: 404, body: { error: "That reminder is already gone." } });
  });

  it("refuses a unit manager deleting someone else's, and lets an admin", async () => {
    staff.findNudge.mockResolvedValue({ id: "n1", senderId: "m9" });
    const refused = await remove();
    expect(refused).toEqual({ status: 403, body: { error: "You can only delete reminders you sent." } });
    expect(staff.deleteNudge).not.toHaveBeenCalled();

    auth.mockResolvedValue({ user: { id: "admin", role: "ADMIN", name: "Ada" } });
    expect((await remove()).status).toBe(200);
  });
});
```

Create `src/app/api/nudges/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, listNudges, unreadNudgeCount, markNudgesRead } = vi.hoisted(() => ({
  auth: vi.fn(),
  listNudges: vi.fn(),
  unreadNudgeCount: vi.fn(),
  markNudgesRead: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/staff", () => ({ listNudges, unreadNudgeCount, markNudgesRead }));

import { GET, PATCH } from "./route";

const created = new Date("2026-10-14T09:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "r1", role: "USER" } });
  listNudges.mockResolvedValue([
    { id: "n1", senderId: "m1", senderName: "Mae", message: "Keep going", createdAt: created, readAt: null },
  ]);
  unreadNudgeCount.mockResolvedValue(3);
});

const patch = (body?: unknown) =>
  PATCH(new Request("http://internal.local/api/nudges", {
    method: "PATCH",
    body: body === undefined ? undefined : JSON.stringify(body),
  }));

describe("GET /api/nudges", () => {
  it("returns the caller's twenty newest and the unread count, in today's shape", async () => {
    const response = await GET();

    expect(listNudges).toHaveBeenCalledWith("r1", 20);
    expect(unreadNudgeCount).toHaveBeenCalledWith("r1");
    expect(JSON.stringify(await response.json())).toBe(JSON.stringify({
      nudges: [{ id: "n1", sender: "Mae", message: "Keep going", createdAt: created.toISOString(), read: false }],
      unread: 3,
    }));
  });

  it("answers 401 signed out", async () => {
    auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });
});

describe("PATCH /api/nudges", () => {
  it("marks one when the body names it", async () => {
    const response = await patch({ id: "n1" });
    expect(markNudgesRead).toHaveBeenCalledWith("r1", "n1");
    expect(await response.json()).toEqual({ unread: 3 });
  });

  it("marks all with no body, or an id that is not a string", async () => {
    await patch();
    expect(markNudgesRead).toHaveBeenLastCalledWith("r1", null);
    await patch({ id: 42 });
    expect(markNudgesRead).toHaveBeenLastCalledWith("r1", null);
  });

  it("answers 500 when the write fails", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    markNudgesRead.mockRejectedValue(new Error("down"));
    const response = await patch({ id: "n1" });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to update reminders" });
    errors.mockRestore();
  });
});
```

- [ ] **Step 6: Run them to verify they fail**

Run: `pnpm test "src/app/api/admin/reviewees/\[id\]/nudge/route.test.ts" src/app/api/nudges/route.test.ts`
Expected: FAIL — the routes still call `pool.query`.

- [ ] **Step 7: Switch the staff nudge route**

In `src/app/api/admin/reviewees/[id]/nudge/route.ts`:
- Remove `import pool from "@/lib/db";`; import from `@/server/data/staff`: `deleteNudge, findActiveAccount, findNudge, lastNudgeSentAt, listNudges, sendNudge, touchLastSeen, type NudgeRecord`.
- In `reachReviewee`, replace the query and `const reviewee = target.rows[0];` with `const reviewee = await findActiveAccount(revieweeId);`, and the `canNudge` call with:

```ts
  const allowed = canNudge(
    { role, id: currentUserId },
    { role: reviewee.role, manager_id: reviewee.managerId },
  );
```

- In `POST`, replace the `last` query, `lastSentAt` and the `INSERT` with:

```ts
    const lastSent = await lastNudgeSentAt(id, sender.id);
    const msSinceLast = lastSent === null ? null : Date.now() - lastSent.getTime();
```

and, after the cooldown check:

```ts
    const sent = await sendNudge({
      userId: id,
      senderId: sender.id,
      senderName: sender.name ?? "Your manager",
      message: resolved.message,
    });

    return NextResponse.json({
      message: `Reminder sent to ${reviewee.name}.`,
      nudge: asSentNudge(sent),
    });
```

- Replace `type NudgeRow` and `asSentNudge` with:

```ts
const asSentNudge = (row: NudgeRecord) => ({
  id: row.id,
  senderId: row.senderId,
  sender: row.senderName,
  message: row.message,
  createdAt: row.createdAt,
  read: row.readAt !== null,
});
```

- In `GET`, replace the query with `const rows = await listNudges(id, 20);` (keep `rows.map(asSentNudge)`).
- In `DELETE`, replace the `found` query and `const nudge = found.rows[0];` with `const nudge = await findNudge(nudgeId, id);`, the `canDeleteNudge` call with `canDeleteNudge(reach.sender, { sender_id: nudge.senderId })`, and the `DELETE` query with `await deleteNudge(nudgeId);`.

- [ ] **Step 8: Switch the bell's route**

In `src/app/api/nudges/route.ts`:
- Replace `import pool from "@/lib/db";` with `import { listNudges, markNudgesRead, unreadNudgeCount } from "@/server/data/staff";`.
- In `GET`, replace the two queries and the response with:

```ts
    const nudges = await listNudges(session.user.id, LIMIT);
    const unread = await unreadNudgeCount(session.user.id);

    return NextResponse.json({
      nudges: nudges.map((row) => ({
        id: row.id,
        sender: row.senderName,
        message: row.message,
        createdAt: row.createdAt,
        read: row.readAt !== null,
      })),
      // Counted across every row, not just the twenty returned, so a buried
      // reminder still keeps the dot lit.
      unread,
    });
```

- In `PATCH`, replace the `if (one) … else …` block and the count query with:

```ts
    await markNudgesRead(session.user.id, one);
    return NextResponse.json({ unread: await unreadNudgeCount(session.user.id) });
```

- [ ] **Step 9: Run the route tests to verify they pass**

Run: `pnpm test "src/app/api/admin/reviewees/\[id\]/nudge/route.test.ts" src/app/api/nudges/route.test.ts`
Expected: PASS.

- [ ] **Step 10: Confirm nothing imports `pg` through `db.ts`**

Run: `git grep -l "@/lib/db" -- src`
Expected: no output. (`src/lib/db.ts` itself stays until Wave 5.)

- [ ] **Step 11: Verify and commit**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm test:db` → all pass.

```bash
git add src/server/data/staff.ts src/server/data/staff.db.test.ts "src/app/api/admin/reviewees/[id]/nudge" src/app/api/nudges
git commit -m "refactor: send, list, take back and read nudges through the staff module"
```

---

### Task 5: Staff parity against the production restore

**Files:**
- Create: `scripts/parity/staff-parity.ts`
- Modify: `package.json` (add `"parity:staff": "tsx --conditions=react-server scripts/parity/staff-parity.ts"` after `parity:exams`)

**Interfaces:**
- Consumes: `listReviewees`, `listManagers`, `findActiveAccount`, `listNudges`, `unreadNudgeCount`, `lastNudgeSentAt` (Tasks 2–4).

- [ ] **Step 1: Write the script**

Create `scripts/parity/staff-parity.ts`:

```ts
// Compares the pre-Prisma staff SQL with src/server/data/staff.ts on the
// local dev copy. Exit code 1 on any difference. Run: pnpm parity:staff
//
// The old queries are copied from the routes as they stood before Wave 4
// (commit 3b98519), so this stays a fixed reference after they change.
// Read-only: nothing here writes.
import { config } from "dotenv";
import { Pool } from "pg";
import { assertLocalDatabase } from "../../src/server/db/local-guard";

config({ path: ".env.local" });
const url = assertLocalDatabase(process.env.MIGRATE_DATABASE_URL);
process.env.DATABASE_URL = url;

const pool = new Pool({ connectionString: url });
const diffs: string[] = [];

// JSON round trip: Dates become the ISO strings the API sends.
const json = (value: unknown) => JSON.stringify(JSON.parse(JSON.stringify(value ?? null)));

function same(label: string, oldValue: unknown, newValue: unknown) {
  const a = json(oldValue);
  const b = json(newValue);
  if (a !== b) diffs.push(`${label}\n  old: ${a}\n  new: ${b}`);
}

const OLD_REVIEWEES = `
  SELECT u.id, u.email, u.name, u.role, u.image,
         m.id    AS manager_id,
         m.name  AS manager_name,
         m.email AS manager_email,
         m.role  AS manager_role,
         m.image AS manager_image
    FROM users u
    LEFT JOIN users m ON m.id = u.manager_id
   WHERE u.role = 'USER' AND u.deleted_at IS NULL`;

const OLD_MANAGERS = `
  SELECT u.id, u.name, u.email, u.image, u.last_seen_at,
         COUNT(r.id) AS reviewees
    FROM users u
    LEFT JOIN users r ON r.manager_id = u.id AND r.role = 'USER'
                     AND r.deleted_at IS NULL
   WHERE u.role = 'MANAGER' AND u.deleted_at IS NULL
   GROUP BY u.id
   ORDER BY u.last_seen_at DESC NULLS LAST, u.name ASC`;

const OLD_TARGET = `
  SELECT id, name, email, role, manager_id FROM users
   WHERE id = $1 AND deleted_at IS NULL`;

const OLD_NUDGES = `
  SELECT id, sender_id, sender_name, message, created_at, read_at
    FROM nudges
   WHERE user_id = $1
   ORDER BY created_at DESC
   LIMIT 20`;

const OLD_UNREAD = `
  SELECT COUNT(*)::int AS count FROM nudges
   WHERE user_id = $1 AND read_at IS NULL`;

const OLD_LAST_SENT = `
  SELECT created_at FROM nudges
   WHERE user_id = $1 AND sender_id = $2
   ORDER BY created_at DESC
   LIMIT 1`;

/** The roster row's leading fields, as the route builds them. */
const rosterHead = (r: {
  id: string; name: string; email: string; image: string | null;
  manager: { id: string; name: string; email: string; role: string; image: string | null } | null;
}) => ({ id: r.id, name: r.name, email: r.email, image: r.image ?? null, manager: r.manager });

const oldRosterHead = (row: Record<string, string | null>) =>
  rosterHead({
    id: row.id!, name: row.name!, email: row.email!, image: row.image,
    manager: row.manager_id
      ? { id: row.manager_id, name: row.manager_name!, email: row.manager_email!, role: row.manager_role!, image: row.manager_image ?? null }
      : null,
  });

async function main() {
  const staff = await import("../../src/server/data/staff");

  console.log("Comparing the admin roster…");
  same(
    "roster (admin)",
    (await pool.query(`${OLD_REVIEWEES} ORDER BY u.name ASC`)).rows.map(oldRosterHead),
    (await staff.listReviewees(null)).map(rosterHead),
  );

  const staffIds = (
    await pool.query(`SELECT id::text FROM users WHERE role IN ('MANAGER', 'ADMIN')`)
  ).rows.map((r) => r.id as string);
  console.log(`Comparing each of ${staffIds.length} staff accounts' own roster…`);
  for (const id of staffIds) {
    same(
      `roster (manager ${id})`,
      (await pool.query(`${OLD_REVIEWEES} AND u.manager_id = $1 ORDER BY u.name ASC`, [id])).rows.map(oldRosterHead),
      (await staff.listReviewees(id)).map(rosterHead),
    );
  }

  console.log("Comparing the managers list…");
  same(
    "managers",
    (await pool.query(OLD_MANAGERS)).rows.map((row) => ({
      id: row.id, name: row.name, email: row.email, image: row.image ?? null,
      lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null,
      reviewees: Number(row.reviewees),
    })),
    (await staff.listManagers()).map((m) => ({
      id: m.id, name: m.name, email: m.email, image: m.image ?? null,
      lastSeenAt: m.lastSeenAt ? m.lastSeenAt.toISOString() : null,
      reviewees: m.reviewees,
    })),
  );

  const users = (await pool.query(`SELECT id::text FROM users`)).rows.map((r) => r.id as string);
  console.log(`Comparing targets, reminders and unread counts for ${users.length} users…`);
  for (const id of users) {
    const old = (await pool.query(OLD_TARGET, [id])).rows[0];
    same(
      `target ${id}`,
      old && { id: old.id, name: old.name, email: old.email, role: old.role, managerId: old.manager_id },
      await staff.findActiveAccount(id),
    );

    same(
      `nudges ${id}`,
      (await pool.query(OLD_NUDGES, [id])).rows.map((row) => ({
        id: row.id, senderId: row.sender_id, sender: row.sender_name,
        message: row.message, createdAt: row.created_at, read: row.read_at !== null,
      })),
      (await staff.listNudges(id, 20)).map((n) => ({
        id: n.id, senderId: n.senderId, sender: n.senderName,
        message: n.message, createdAt: n.createdAt, read: n.readAt !== null,
      })),
    );

    same(
      `unread ${id}`,
      (await pool.query(OLD_UNREAD, [id])).rows[0]?.count ?? 0,
      await staff.unreadNudgeCount(id),
    );
  }

  const pairs = (
    await pool.query(
      `SELECT DISTINCT user_id::text, sender_id::text FROM nudges WHERE sender_id IS NOT NULL`,
    )
  ).rows as { user_id: string; sender_id: string }[];
  console.log(`Comparing the cooldown's last send for ${pairs.length} reviewee–sender pairs…`);
  for (const { user_id, sender_id } of pairs) {
    same(
      `last sent ${user_id} by ${sender_id}`,
      (await pool.query(OLD_LAST_SENT, [user_id, sender_id])).rows[0]?.created_at ?? null,
      await staff.lastNudgeSentAt(user_id, sender_id),
    );
  }

  console.log(diffs.length === 0 ? "parity: 0 differences" : diffs.join("\n"));
  if (diffs.length) process.exitCode = 1;
  console.log(
    "Intended difference, not compared: a racing second removal no longer writes a second audit row.",
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

If two reminders to one user share a `created_at` and the `LIMIT 20` cut falls between them, the two queries may legitimately pick different rows. If the script reports a `nudges` difference, check for tied timestamps before treating it as a bug, and record what you find.

- [ ] **Step 2: Add the script to `package.json`**

After the `"parity:exams"` line:

```json
    "parity:staff": "tsx --conditions=react-server scripts/parity/staff-parity.ts",
```

- [ ] **Step 3: Run it**

Run: `pnpm parity:staff`
Expected: the counts it compared, then `parity: 0 differences`, exit 0. Record the counts in the ledger for the outcome.

- [ ] **Step 4: Commit**

```bash
git add scripts/parity/staff-parity.ts package.json
git commit -m "test: compare the old staff SQL with the staff module"
```

---

### Task 6: Verify, manual pass, record the outcome

**Files:**
- Modify: `docs/superpowers/specs/2026-10-14-prisma-migration-design.md`

- [ ] **Step 1: Confirm nothing uses `pg` through `db.ts`**

Run: `git grep -l "@/lib/db" -- src scripts`
Expected: no output. (`scripts/parity/*` import `pg` directly, which is intended.)

- [ ] **Step 2: Full verification**

Run each and record its result line:
- `pnpm typecheck` → exit 0
- `pnpm lint` → 0 errors
- `pnpm test` → all pass
- `pnpm test:db` → all pass (the user-delete cascade test still covers `nudges` and `admin_actions`)
- `pnpm parity`, `pnpm parity:content`, `pnpm parity:exams`, `pnpm parity:staff` → 0 differences each
- `pnpm build` → exit 0

If `pnpm typecheck` fails on stale `.next/types` or `.next/dev/types`, delete them.

- [ ] **Step 3: Manual pass in `pnpm dev`. Ask Nelson first.**

The local `insure_dev` holds real people's accounts from the production restore, so don't sign in as any of them. As in Waves 2–3, make throwaway accounts through the app's own invite and signup flow. This wave needs a staff account to drive the console; ask Nelson how to get one (a MANAGER invite made by an admin he signs in as, or his approval to set a throwaway account's role in the **local** `insure_dev` only).

The screens and checks for this wave:
- `/admin` roster lists the throwaway manager's own recruit; an admin sees every reviewee with their recruiter.
- Field managers page lists managers with presence and reviewee counts; opening any screen moves the manager's "last seen".
- Send a reminder from the roster; a second inside four hours answers with the cooldown message; the reviewee's bell shows it with the dot lit; opening it clears the dot; the manager's dialog lists it as read; deleting it removes it.
- Remove the throwaway reviewee: it leaves the roster, and exactly one `reviewee.removed` row exists for it in `admin_actions` (read-only `SELECT` on the local DB).

Delete the throwaway accounts afterwards; everything they wrote cascades (their audit rows keep their snapshots with the ids set null).

- [ ] **Step 4: Commit any fixes the pass turned up**

Each fix gets its own commit with a plain message. If there were none, skip this step.

- [ ] **Step 5: Record the outcome in the spec**

In `docs/superpowers/specs/2026-10-14-prisma-migration-design.md`:

1. Change the status line to `**Status:** approved; Waves 0–4 implemented (see Wave 0, 1, 2, 3 and 4 outcomes)`.
2. Append this section after "Wave 3 outcome" and before "After the waves", adjusted to what actually happened (counts from the parity run, anything that surprised you):

```markdown
## Wave 4 outcome (2026-10-14)

- **`src/server/data/staff.ts`** holds the roster and managers reads, the
  account a staff action targets, removal, nudges, the audit log and
  presence stamps. `_lib/presence-store.ts` and `_lib/audit-store.ts`
  moved into it and were deleted; their callers (including the Wave 1
  invites and avatar routes) import from it. Nothing in `src` imports
  `@/lib/db` any more, so its pool is never created; Wave 5 deletes it.
- **Removal is recorded once.** `removeReviewee` reports whether its
  `updateMany` stamped the row, and the route writes the audit row only
  then. Before, two removals racing both wrote one. Both still answer 200
  with the same body.
- **No-op writes stay no-ops.** Presence stamps, removal, marking read and
  deleting a reminder use `updateMany` / `deleteMany`, so a row that is
  already gone is not a P2025.
- **Clock.** `last_seen_at`, `deleted_at`, `read_at` and `nudges.created_at`
  come from the app clock, so the cooldown compares two app-clock instants.
- **Parity:** `pnpm parity:staff` compares the admin roster, every staff
  account's own roster, the managers list, every user's staff-action
  target, reminders and unread count, and every reviewee–sender cooldown
  with the old SQL on the production restore: 0 differences.
- **Not changed, recorded:** two sends at once can both pass the cooldown;
  a malformed id is still a 500.
- **Production needs nothing for this wave:** no migration, no schema change.
```

- [ ] **Step 6: Commit the spec**

```bash
git add docs/superpowers/specs/2026-10-14-prisma-migration-design.md
git commit -m "docs: record what Wave 4 found"
```

- [ ] **Step 7: Final review, then the PR**

Dispatch a fresh reviewer on the whole branch since `3b98519`. Record its findings in the spec's Wave 4 outcome, as Waves 2–3 did. Then ask Nelson before opening the PR, and open it with `gh pr create --base dev` (check that the base reads `dev` before submitting).
