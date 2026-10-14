# Prisma Wave 1 (Accounts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every account query — sign-in, session refresh, avatar, tours, password reset, invites and registration — off the `pg` pool onto one Prisma data module, and delete the unused `GET /api/user`.

**Architecture:** One new module, `src/server/data/users.ts`, holds every account read and write and returns camelCase domain objects. Route handlers and `src/lib/auth.ts` keep auth, validation and response shaping, and map back to today's exact JSON. Registration and password reset are `prisma.$transaction`s, so they're still all-or-nothing. Data functions are tested against the local test database. Route response shapes are pinned by unit tests that mock the module.

**Tech Stack:** Next.js 16 route handlers, Prisma 7.10 (`@/generated/prisma/client`, `@prisma/adapter-pg`), PostgreSQL, Vitest 4 (`unit` and `db` projects), bcryptjs, Auth.js v5.

**Spec:** `docs/superpowers/specs/2026-10-14-prisma-migration-design.md` (read "Wave 0 outcome" first)

## Global Constraints

- **Existing data is never affected.** This wave adds no migration and changes no schema. If a task seems to need one, stop and ask.
- **Never touch the Railway database.** No `prisma db push`, `migrate dev`, `migrate deploy`, `migrate resolve` or `migrate reset` against it. Don't read `.env`. Every DB command uses `.env.local` (local `insure_dev`, test DB `insure`).
- **Response shapes stay byte-for-byte compatible.** The only intended API change in this wave is that `GET /api/user` is deleted.
- **`updated_at` is written only by the `set_updated_at` trigger.** Never set `updatedAt` from Prisma. The old reset route's explicit `updated_at = now()` goes away because the trigger already does it.
- **Raw SQL stays only in `src/server/data/mastery.ts`.** `users.ts` uses the Prisma query API only: no `$queryRaw` or `$executeRaw`.
- **Connection budget stays at 3 (`pg`) + 2 (Prisma).** This wave doesn't change either pool size. The heavy traffic (study) moves in Wave 2.
- **Commits:** plain messages, sole author Nelson Lago III, **no `Co-Authored-By` or any other trailer.**
- **PR:** `gh pr create --base dev`, never `main`.
- **Next.js 16:** this plan edits only route handler bodies. Read `node_modules/next/dist/docs/` before touching any Next API beyond that.
- **pnpm only.**
- **Unit tests:** `pnpm test`. **DB tests:** `pnpm test:db` (rebuilds the local `insure` test DB from migrations; Nelson has consented to that wipe).

## Review Focus

1. **The same invite submitted twice at once.** Expected: exactly one account is created, and the other request gets "This invitation link has already been used." Pinned in Task 4 (`registerWithInvite` concurrent test).
2. **A valid invite used with an email that's already registered.** Expected: 409 "Email already registered", and the invite stays unspent for its real owner (the transaction rolls back). Pinned in Task 4 (email-taken test asserts `usedAt` is still null).
3. **An addressed invite claimed by someone else.** Expected: 403, and the invite stays unspent. Pinned in Task 4.
4. **A soft-deleted account** (`deleted_at` set). Expected: it can't sign in, its session refresh ends the session (null claims), forgot-password sends nothing, and its avatar reads as null. Inviting its address still answers 409, because the email is still taken by the unique constraint. Pinned in Tasks 1, 2, 3 and 4.
5. **JSON shape after the move.** Expected: register still returns `id, email, name, role, manager_id, created_at, signupGrant`, with `created_at` as an ISO string. Invites still return `code, expires_at, role, email, link, ...`. Prisma's camelCase must not leak. Pinned by route unit tests in Task 4.

Also noted, not tested: comparisons that used the database clock (`expires_at > now()`) now use the app server's clock (`new Date()`). With sessions pinned to UTC, the only difference is clock skew between the app host and Postgres, which is seconds at most against expiry windows of one hour and seven days.

---

## File Map

| Path | Responsibility |
| ---- | -------------- |
| `src/server/data/users.ts` | **Create.** Every account query: sign-in, claims, avatar, tours, reset tokens, invites, registration |
| `src/server/data/users.db.test.ts` | **Create.** Tests the module against the local test DB |
| `src/lib/auth.ts` | Modify: `authorize` and `jwt` call `users.ts` |
| `src/app/api/user/avatar/route.ts` | Modify: call `getAvatar` / `setAvatar` |
| `src/app/api/user/tour/route.ts` | Modify: call `markTourSeen` |
| `src/app/api/auth/forgot-password/route.ts` (+ `route.test.ts`) | Modify: call `findActiveUserId` / `issueResetToken`. The test mocks the module, not `@/lib/db` |
| `src/app/api/auth/reset-password/route.ts` | Modify: call `findResetToken` / `resetPassword` |
| `src/app/api/invites/route.ts` | Modify: call `emailHasAccount` / `createInvite` |
| `src/app/api/auth/register/route.ts` | Modify: call `registerWithInvite` |
| `src/app/api/auth/register/route.test.ts`, `src/app/api/invites/route.test.ts` | **Create.** Pin status codes and JSON shape |
| `src/app/api/user/route.ts` | **Delete** |
| `docs/superpowers/specs/2026-10-14-prisma-migration-design.md` | Add "Wave 1 outcome" |

### Shared pieces of `users.db.test.ts`

Task 1 creates the file with this header. Later tasks add `describe` blocks and extend the import list from `./users`:

```ts
import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/server/db/prisma";
import { createUser, deleteUsers, uniqueSuffix } from "@/test/db-fixtures";
import { findSignInAccount, getSessionClaims } from "./users";

// Every user a test makes is listed here and removed in one statement, so a
// manager and their recruits go together (users.manager_id has no delete
// rule) and everything that cascades from them goes too.
const made: string[] = [];
async function user(overrides?: Parameters<typeof createUser>[0]) {
  const created = await createUser(overrides);
  made.push(created.id);
  return created;
}
const softDelete = (id: string) =>
  prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });

afterAll(async () => {
  await deleteUsers(...made);
});
```

---

### Task 1: Data module with the sign-in reads, wired into `lib/auth.ts`

**Files:**
- Create: `src/server/data/users.ts`
- Create: `src/server/data/users.db.test.ts`
- Modify: `src/lib/auth.ts` (imports; `authorize` lines 73–106; `jwt` lines 138–150)

**Interfaces:**
- Consumes: `prisma` default export from `@/server/db/prisma`; `createUser`, `deleteUsers`, `uniqueSuffix` from `@/test/db-fixtures`.
- Produces:
  - `type Role = "USER" | "MANAGER" | "ADMIN"`
  - `type SignInAccount = { id: string; email: string; password: string; name: string; role: Role; managerId: string | null; onboardingToursSeen: string[] }`
  - `findSignInAccount(email: string): Promise<SignInAccount | null>`. Active accounts only. `email` must already be normalized.
  - `type SessionClaims = { role: Role; managerId: string | null; onboardingToursSeen: string[] }`
  - `getSessionClaims(userId: string): Promise<SessionClaims | null>`. Active accounts only.

- [ ] **Step 1: Write the failing test**

Create `src/server/data/users.db.test.ts` with the shared header from the File Map, then add:

```ts
describe("sign-in reads", () => {
  it("finds an active account with what the session needs", async () => {
    const manager = await user({ role: "MANAGER" });

    const found = await findSignInAccount(manager.email);

    expect(found).toEqual({
      id: manager.id,
      email: manager.email,
      password: "not-a-real-hash",
      name: expect.any(String),
      role: "MANAGER",
      managerId: null,
      onboardingToursSeen: [],
    });
  });

  it("reads the current role and manager for a session refresh", async () => {
    const manager = await user({ role: "MANAGER" });
    const recruit = await user({ managerId: manager.id });

    expect(await getSessionClaims(recruit.id)).toEqual({
      role: "USER",
      managerId: manager.id,
      onboardingToursSeen: [],
    });
  });

  it("treats a soft-deleted account as gone", async () => {
    const gone = await user();
    await softDelete(gone.id);

    expect(await findSignInAccount(gone.email)).toBeNull();
    expect(await getSessionClaims(gone.id)).toBeNull();
  });

  it("answers null for an address nobody has", async () => {
    expect(
      await findSignInAccount(`nobody-${uniqueSuffix()}@example.test`),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `pnpm test:db src/server/data/users.db.test.ts`
Expected: FAIL, because `./users` can't be resolved.

- [ ] **Step 3: Write the module**

Create `src/server/data/users.ts`:

```ts
import "server-only";
import prisma from "@/server/db/prisma";

/**
 * Accounts: who may sign in, what their session claims, their photo and
 * tours, password resets, invitations and registration. Every query on
 * users, password_reset_tokens and registration_invites goes through here.
 *
 * "Active" means deleted_at IS NULL. Removing someone from the console is a
 * soft delete, and every read that decides what an account may do filters on
 * it.
 */

export type Role = "USER" | "MANAGER" | "ADMIN";

export type SignInAccount = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  managerId: string | null;
  onboardingToursSeen: string[];
};

/** The account behind a sign-in attempt. `email` is already normalised. */
export async function findSignInAccount(
  email: string,
): Promise<SignInAccount | null> {
  return prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: {
      id: true,
      email: true,
      password: true,
      name: true,
      role: true,
      managerId: true,
      onboardingToursSeen: true,
    },
  });
}

export type SessionClaims = {
  role: Role;
  managerId: string | null;
  onboardingToursSeen: string[];
};

/** What a session may claim right now; null once the account is gone. */
export async function getSessionClaims(
  userId: string,
): Promise<SessionClaims | null> {
  return prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { role: true, managerId: true, onboardingToursSeen: true },
  });
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test:db src/server/data/users.db.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Wire `src/lib/auth.ts`**

Replace `import pool from "@/lib/db";` with:

```ts
import { findSignInAccount, getSessionClaims } from "@/server/data/users";
```

In `authorize`, replace everything from `const result = await pool.query(` through the closing `};` of the returned object with:

```ts
        const user = await findSignInAccount(normalizedEmail);

        if (!user) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          managerId: user.managerId,
          onboardingToursSeen: user.onboardingToursSeen,
        };
```

In `jwt`, replace the inside of the `try` block with:

```ts
        const account = await getSessionClaims(base.id);
        if (!account) return null;

        base.role = account.role;
        base.managerId = account.managerId;
        base.onboardingToursSeen = account.onboardingToursSeen;
```

Leave the doc comment, the `catch` and everything else as they are. The jwt comment says "the Postgres pool cannot". Change that to "Prisma cannot", because that's still true on the edge.

- [ ] **Step 6: Typecheck, lint, unit tests**

Run: `pnpm typecheck` → exit 0. `pnpm lint` → 0 errors (the 23 existing warnings are expected). `pnpm test` → all pass.

- [ ] **Step 7: Commit**

```bash
git add src/server/data/users.ts src/server/data/users.db.test.ts src/lib/auth.ts
git commit -m "refactor: read sign-in and session claims from the users module"
```

---

### Task 2: Avatar and tours

**Files:**
- Modify: `src/server/data/users.ts` (append)
- Modify: `src/server/data/users.db.test.ts` (append; extend the import)
- Modify: `src/app/api/user/avatar/route.ts`
- Modify: `src/app/api/user/tour/route.ts`

**Interfaces:**
- Consumes: `Role` from Task 1.
- Produces:
  - `getAvatar(userId: string): Promise<string | null>`. Returns null for a soft-deleted account.
  - `setAvatar(userId: string, image: string | null): Promise<void>`. No `deleted_at` filter, matching today.
  - `markTourSeen(userId: string, role: Role): Promise<void>`. Idempotent: it never adds a role twice.

- [ ] **Step 1: Write the failing tests**

Add `getAvatar, markTourSeen, setAvatar` to the `./users` import. Then append:

```ts
describe("avatar", () => {
  it("stores, reads and clears the photo", async () => {
    const me = await user();
    const photo = "data:image/png;base64,AAAA";

    await setAvatar(me.id, photo);
    expect(await getAvatar(me.id)).toBe(photo);

    await setAvatar(me.id, null);
    expect(await getAvatar(me.id)).toBeNull();
  });

  it("reads no photo for a soft-deleted account", async () => {
    const gone = await user();
    await setAvatar(gone.id, "data:image/png;base64,AAAA");
    await softDelete(gone.id);

    expect(await getAvatar(gone.id)).toBeNull();
  });
});

describe("tours", () => {
  it("records a role's tour once, however often it is marked", async () => {
    const me = await user({ role: "MANAGER" });

    await markTourSeen(me.id, "MANAGER");
    await markTourSeen(me.id, "MANAGER");
    await markTourSeen(me.id, "USER");

    const claims = await getSessionClaims(me.id);
    expect(claims?.onboardingToursSeen).toEqual(["MANAGER", "USER"]);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test:db src/server/data/users.db.test.ts`
Expected: FAIL, because `getAvatar` / `setAvatar` / `markTourSeen` aren't exported.

- [ ] **Step 3: Append to `users.ts`**

```ts
/** The account's photo, a data URL; null if none or the account is gone. */
export async function getAvatar(userId: string): Promise<string | null> {
  const row = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { image: true },
  });
  return row?.image ?? null;
}

/** Sets or (with null) clears the photo. */
export async function setAvatar(
  userId: string,
  image: string | null,
): Promise<void> {
  await prisma.user.updateMany({ where: { id: userId }, data: { image } });
}

/**
 * Adds the role to the tours this account has seen, unless it is already
 * there. The condition is in the WHERE, so two tabs finishing the tour at
 * once still record it once.
 */
export async function markTourSeen(userId: string, role: Role): Promise<void> {
  await prisma.user.updateMany({
    where: { id: userId, NOT: { onboardingToursSeen: { has: role } } },
    data: { onboardingToursSeen: { push: role } },
  });
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test:db src/server/data/users.db.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Rewire the two routes**

In `src/app/api/user/avatar/route.ts`, replace `import pool from "@/lib/db";` with `import { getAvatar, setAvatar } from "@/server/data/users";`. Then make these replacements:

- In GET, replace the `pool.query(...)` and its `return` with:
  ```ts
      const image = await getAvatar(session.user.id);
      return NextResponse.json({ image });
  ```
- In POST, replace the `await pool.query(\`UPDATE users SET image = $2 ...\`)` call with `await setAvatar(session.user.id, image);`
- In DELETE, replace the `await pool.query(\`UPDATE users SET image = NULL ...\`)` call with `await setAvatar(session.user.id, null);`

In `src/app/api/user/tour/route.ts`, replace `import pool from "@/lib/db";` with `import { markTourSeen } from "@/server/data/users";`, and replace the `await pool.query(...)` statement with:

```ts
  await markTourSeen(session.user.id, session.user.role);
```

- [ ] **Step 6: Typecheck, lint, unit tests**

Run: `pnpm typecheck`, `pnpm lint`, `pnpm test`. Expected: all clean, as in Task 1.

- [ ] **Step 7: Commit**

```bash
git add src/server/data/users.ts src/server/data/users.db.test.ts src/app/api/user/avatar/route.ts src/app/api/user/tour/route.ts
git commit -m "refactor: move avatar and tour writes to the users module"
```

---

### Task 3: Password reset

**Files:**
- Modify: `src/server/data/users.ts` (append)
- Modify: `src/server/data/users.db.test.ts` (append; extend the import)
- Modify: `src/app/api/auth/forgot-password/route.ts`
- Modify: `src/app/api/auth/forgot-password/route.test.ts`
- Modify: `src/app/api/auth/reset-password/route.ts`

**Interfaces:**
- Consumes: `createResetToken`, `hashResetToken`, `isTokenUsable` from `@/lib/helper/reset-token`. They're unchanged. `isTokenUsable(token: { expiresAt: Date; usedAt: Date | null }, now?)`.
- Produces:
  - `findActiveUserId(email: string): Promise<string | null>`
  - `issueResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>`. In one transaction, it spends every unused token for the user and inserts the new one.
  - `type ResetTokenRecord = { id: string; userId: string; expiresAt: Date; usedAt: Date | null }`
  - `findResetToken(tokenHash: string): Promise<ResetTokenRecord | null>`
  - `resetPassword(tokenId: string, userId: string, passwordHash: string): Promise<boolean>`. In one transaction, it spends the token if it's still usable and sets the password. Returns false and changes nothing if the token was already spent or has expired.

- [ ] **Step 1: Write the failing tests**

Add `findActiveUserId, findResetToken, issueResetToken, resetPassword` to the `./users` import. Then append:

```ts
describe("password reset", () => {
  const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000);
  const passwordOf = async (id: string) =>
    (await prisma.user.findUniqueOrThrow({ where: { id } })).password;

  it("finds active accounts only", async () => {
    const me = await user();
    const gone = await user();
    await softDelete(gone.id);

    expect(await findActiveUserId(me.email)).toBe(me.id);
    expect(await findActiveUserId(gone.email)).toBeNull();
  });

  it("spends every earlier link when a new one is issued", async () => {
    const me = await user();
    const first = `hash-${uniqueSuffix()}`;
    const second = `hash-${uniqueSuffix()}`;

    await issueResetToken(me.id, first, inAnHour());
    await issueResetToken(me.id, second, inAnHour());

    expect((await findResetToken(first))?.usedAt).toBeInstanceOf(Date);
    expect(await findResetToken(second)).toMatchObject({
      userId: me.id,
      usedAt: null,
    });
  });

  it("sets the password once and refuses the same link again", async () => {
    const me = await user();
    const hash = `hash-${uniqueSuffix()}`;
    await issueResetToken(me.id, hash, inAnHour());
    const token = (await findResetToken(hash))!;
    const before = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });

    expect(await resetPassword(token.id, me.id, "new-hash")).toBe(true);
    expect(await passwordOf(me.id)).toBe("new-hash");

    // The trigger, not Prisma, moves updated_at.
    const after = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());

    expect(await resetPassword(token.id, me.id, "other-hash")).toBe(false);
    expect(await passwordOf(me.id)).toBe("new-hash");
  });

  it("refuses an expired link and leaves the password alone", async () => {
    const me = await user();
    const hash = `hash-${uniqueSuffix()}`;
    await issueResetToken(me.id, hash, new Date(Date.now() - 1000));
    const token = (await findResetToken(hash))!;

    expect(await resetPassword(token.id, me.id, "new-hash")).toBe(false);
    expect(await passwordOf(me.id)).toBe("not-a-real-hash");
    expect((await findResetToken(hash))?.usedAt).toBeNull();
  });

  it("finds nothing for an unknown hash", async () => {
    expect(await findResetToken(`hash-${uniqueSuffix()}`)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test:db src/server/data/users.db.test.ts`
Expected: FAIL, because the four functions aren't exported.

- [ ] **Step 3: Append to `users.ts`**

```ts
/** The id of the active account with this (normalised) address. */
export async function findActiveUserId(email: string): Promise<string | null> {
  const row = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    select: { id: true },
  });
  return row?.id ?? null;
}

/**
 * Records a new reset link. Every earlier link for the account stops working
 * in the same transaction, so a forwarded old email cannot be replayed.
 */
export async function issueResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    }),
  ]);
}

export type ResetTokenRecord = {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
};

export async function findResetToken(
  tokenHash: string,
): Promise<ResetTokenRecord | null> {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
}

/**
 * Spends the link and sets the password, both or neither. The link is spent
 * conditionally, so two submissions of the same one cannot both succeed:
 * false means it was already used or has expired, and nothing changed.
 */
export async function resetPassword(
  tokenId: string,
  userId: string,
  passwordHash: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const spent = await tx.passwordResetToken.updateMany({
      where: { id: tokenId, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (spent.count === 0) return false;

    await tx.user.updateMany({
      where: { id: userId },
      data: { password: passwordHash },
    });
    return true;
  });
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test:db src/server/data/users.db.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Point the forgot-password test at the module (it fails first)**

In `src/app/api/auth/forgot-password/route.test.ts`, replace the hoisted block, the `@/lib/db` mock and the `query.mockImplementation` in `beforeEach` with:

```ts
const { findActiveUserId, issueResetToken, sendMail, mailerConfigured } =
  vi.hoisted(() => ({
    findActiveUserId: vi.fn(),
    issueResetToken: vi.fn(),
    sendMail: vi.fn(),
    mailerConfigured: vi.fn(),
  }));

vi.mock("@/server/data/users", () => ({ findActiveUserId, issueResetToken }));
vi.mock("@/lib/mailer", () => ({ sendMail, mailerConfigured }));
```

and, inside `beforeEach`:

```ts
  findActiveUserId.mockImplementation((email: string) =>
    Promise.resolve(email === KNOWN ? "7" : null),
  );
  issueResetToken.mockResolvedValue(undefined);
```

Add this assertion to the "sends nothing for an address that is not registered" test:

```ts
    expect(issueResetToken).not.toHaveBeenCalled();
```

Add this to the "emails the reset link in production" test:

```ts
    expect(issueResetToken).toHaveBeenCalledWith(
      "7",
      expect.any(String),
      expect.any(Date),
    );
```

Run: `pnpm test src/app/api/auth/forgot-password`
Expected: FAIL. The route still calls `pool.query`, which isn't mocked any more, so it hits the catch and answers 500.

- [ ] **Step 6: Rewire forgot-password**

In `src/app/api/auth/forgot-password/route.ts`, replace `import pool from "@/lib/db";` with:

```ts
import { findActiveUserId, issueResetToken } from "@/server/data/users";
```

Replace everything from `const user = await pool.query(` through the `INSERT INTO password_reset_tokens` statement (lines 29–53) with:

```ts
    const userId = await findActiveUserId(email);

    if (!userId) {
      return NextResponse.json({ message: GENERIC_MESSAGE });
    }

    const { token, tokenHash, expiresAt } = createResetToken();

    // Any earlier link for this account stops working the moment a new one is
    // issued, so a forwarded old email cannot be replayed.
    await issueResetToken(userId, tokenHash, expiresAt);
```

Run: `pnpm test src/app/api/auth/forgot-password` → PASS, 3 tests.

- [ ] **Step 7: Rewire reset-password**

In `src/app/api/auth/reset-password/route.ts`, replace `import pool from "@/lib/db";` with:

```ts
import { findResetToken, resetPassword } from "@/server/data/users";
```

Replace everything from `const found = await pool.query(` to the end of the `finally { client.release(); }` block (lines 26–74) with:

```ts
    const record = await findResetToken(tokenHash);

    if (!record || !isTokenUsable(record)) {
      return NextResponse.json({ error: INVALID_TOKEN }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Spending the token conditionally means two submissions of the same link
    // cannot both succeed.
    const reset = await resetPassword(record.id, record.userId, hashedPassword);

    if (!reset) {
      return NextResponse.json({ error: INVALID_TOKEN }, { status: 400 });
    }
```

The success response and the outer `catch` stay as they are.

- [ ] **Step 8: Typecheck, lint, unit tests**

Run: `pnpm typecheck`, `pnpm lint`, `pnpm test`. Expected: all clean.

- [ ] **Step 9: Commit**

```bash
git add src/server/data/users.ts src/server/data/users.db.test.ts src/app/api/auth/forgot-password src/app/api/auth/reset-password/route.ts
git commit -m "refactor: issue and spend password reset links through the users module"
```

---

### Task 4: Invites and registration

**Files:**
- Modify: `src/server/data/users.ts` (append; add imports at the top)
- Modify: `src/server/data/users.db.test.ts` (append; extend the import)
- Modify: `src/app/api/invites/route.ts`
- Modify: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/invites/route.test.ts`
- Create: `src/app/api/auth/register/route.test.ts`

**Interfaces:**
- Consumes: `claimantMatches`, `isInviteRole`, `managerForInvite`, `type InviteRole` from `@/lib/helper/invites` (unchanged); `Role` from Task 1.
- Produces:
  - `emailHasAccount(email: string): Promise<boolean>`. Counts soft-deleted accounts too, because the address is still taken.
  - `type CreatedInvite = { code: string; expiresAt: Date; role: Role; email: string | null }`
  - `createInvite(input: { code: string; createdBy: string; role: InviteRole; email: string | null }): Promise<CreatedInvite>`. The invite expires seven days from now. For an addressed invite, the same transaction first spends any unused invite to that address.
  - `type RegisteredUser = { id: string; email: string; name: string; role: Role; managerId: string | null; createdAt: Date }`
  - `type RegisterOutcome = { ok: true; user: RegisteredUser } | { ok: false; reason: "invite"; error: string } | { ok: false; reason: "claimant"; error: string } | { ok: false; reason: "email-taken" }`
  - `registerWithInvite(input: { code: string; email: string; name: string; passwordHash: string }): Promise<RegisterOutcome>`. `email` and `name` arrive already normalized (lowercased and trimmed). It claims the invite and creates the user in one transaction. Any failure rolls the claim back.

- [ ] **Step 1: Write the failing data tests**

Add `createInvite, emailHasAccount, registerWithInvite` to the `./users` import. Then append:

```ts
describe("invites", () => {
  const code = () => `code-${uniqueSuffix()}`;
  const inviteBy = (c: string) =>
    prisma.registrationInvite.findUniqueOrThrow({ where: { code: c } });

  it("makes an open link that lasts seven days", async () => {
    const admin = await user({ role: "ADMIN" });
    const c = code();

    const invite = await createInvite({
      code: c, createdBy: admin.id, role: "USER", email: null,
    });

    expect(invite).toMatchObject({ code: c, role: "USER", email: null });
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(
      Math.abs(invite.expiresAt.getTime() - (Date.now() + sevenDays)),
    ).toBeLessThan(60_000);
  });

  it("replaces an earlier invite to the same address", async () => {
    const admin = await user({ role: "ADMIN" });
    const address = `invitee-${uniqueSuffix()}@example.test`;
    const first = code();
    const second = code();

    await createInvite({ code: first, createdBy: admin.id, role: "MANAGER", email: address });
    await createInvite({ code: second, createdBy: admin.id, role: "MANAGER", email: address });

    expect((await inviteBy(first)).usedAt).toBeInstanceOf(Date);
    expect((await inviteBy(second)).usedAt).toBeNull();
  });

  it("counts a soft-deleted account's address as taken", async () => {
    const gone = await user();
    await softDelete(gone.id);

    expect(await emailHasAccount(gone.email)).toBe(true);
    expect(await emailHasAccount(`free-${uniqueSuffix()}@example.test`)).toBe(false);
  });
});

describe("registerWithInvite", () => {
  const code = () => `code-${uniqueSuffix()}`;
  const address = () => `new-${uniqueSuffix()}@example.test`;
  const inviteBy = (c: string) =>
    prisma.registrationInvite.findUniqueOrThrow({ where: { code: c } });
  async function register(c: string, email = address()) {
    const outcome = await registerWithInvite({
      code: c, email, name: "New Person", passwordHash: "hash",
    });
    if (outcome.ok) made.push(outcome.user.id);
    return outcome;
  }

  it("creates a reviewee under whoever invited them and spends the link", async () => {
    const manager = await user({ role: "MANAGER" });
    const c = code();
    await createInvite({ code: c, createdBy: manager.id, role: "USER", email: null });
    const email = address();

    const outcome = await register(c, email);

    expect(outcome).toEqual({
      ok: true,
      user: {
        id: expect.any(String),
        email,
        name: "New Person",
        role: "USER",
        managerId: manager.id,
        createdAt: expect.any(Date),
      },
    });
    expect((await inviteBy(c)).usedAt).toBeInstanceOf(Date);
  });

  it("creates a Unit Manager who reports to nobody", async () => {
    const admin = await user({ role: "ADMIN" });
    const c = code();
    const email = address();
    await createInvite({ code: c, createdBy: admin.id, role: "MANAGER", email });

    const outcome = await register(c, email);

    expect(outcome).toMatchObject({ ok: true, user: { role: "MANAGER", managerId: null } });
  });

  it("explains a spent, an unknown and an expired code", async () => {
    const admin = await user({ role: "ADMIN" });
    const spent = code();
    await createInvite({ code: spent, createdBy: admin.id, role: "USER", email: null });
    await register(spent);

    const expired = code();
    await prisma.registrationInvite.create({
      data: { code: expired, createdBy: admin.id, expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await register(spent)).toEqual({
      ok: false, reason: "invite", error: "This invitation link has already been used.",
    });
    expect(await register(code())).toEqual({
      ok: false, reason: "invite", error: "This invitation code is not valid.",
    });
    expect(await register(expired)).toEqual({
      ok: false, reason: "invite", error: "This invitation link has expired.",
    });
  });

  it("refuses someone else's addressed invite and leaves it for them", async () => {
    const admin = await user({ role: "ADMIN" });
    const c = code();
    await createInvite({ code: c, createdBy: admin.id, role: "MANAGER", email: address() });

    expect(await register(c, address())).toEqual({
      ok: false, reason: "claimant",
      error: "This invitation was sent to a different email address.",
    });
    expect((await inviteBy(c)).usedAt).toBeNull();
  });

  it("refuses a registered address and leaves the invite unspent", async () => {
    const admin = await user({ role: "ADMIN" });
    const existing = await user();
    const c = code();
    await createInvite({ code: c, createdBy: admin.id, role: "USER", email: null });

    expect(await register(c, existing.email)).toEqual({
      ok: false, reason: "email-taken",
    });
    expect((await inviteBy(c)).usedAt).toBeNull();
  });

  it("lets only one of two simultaneous signups spend a link", async () => {
    const admin = await user({ role: "ADMIN" });
    const c = code();
    await createInvite({ code: c, createdBy: admin.id, role: "USER", email: null });

    const outcomes = await Promise.all([register(c), register(c)]);

    expect(outcomes.filter((o) => o.ok)).toHaveLength(1);
    expect(outcomes.find((o) => !o.ok)).toEqual({
      ok: false, reason: "invite", error: "This invitation link has already been used.",
    });
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test:db src/server/data/users.db.test.ts`
Expected: FAIL, because the three functions aren't exported.

- [ ] **Step 3: Append to `users.ts`**

Add these imports below `import prisma ...`:

```ts
import { Prisma } from "@/generated/prisma/client";
import {
  claimantMatches,
  isInviteRole,
  managerForInvite,
  type InviteRole,
} from "@/lib/helper/invites";
```

Then append:

```ts
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Whether any account, removed or not, holds this (normalised) address. */
export async function emailHasAccount(email: string): Promise<boolean> {
  return (await prisma.user.count({ where: { email } })) > 0;
}

export type CreatedInvite = {
  code: string;
  expiresAt: Date;
  role: Role;
  email: string | null;
};

/**
 * Records a signup link that lasts seven days. A second invite to the same
 * address replaces the first in the same transaction, so an address never
 * holds two live links to spend.
 */
export async function createInvite(input: {
  code: string;
  createdBy: string;
  role: InviteRole;
  email: string | null;
}): Promise<CreatedInvite> {
  const create = prisma.registrationInvite.create({
    data: { ...input, expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
    select: { code: true, expiresAt: true, role: true, email: true },
  });
  if (!input.email) return create;

  const [, invite] = await prisma.$transaction([
    prisma.registrationInvite.updateMany({
      where: { email: input.email, usedAt: null },
      data: { usedAt: new Date() },
    }),
    create,
  ]);
  return invite;
}

export type RegisteredUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  managerId: string | null;
  createdAt: Date;
};

export type RegisterOutcome =
  | { ok: true; user: RegisteredUser }
  | { ok: false; reason: "invite"; error: string }
  | { ok: false; reason: "claimant"; error: string }
  | { ok: false; reason: "email-taken" };

/** Thrown inside the transaction to undo the claim and answer with `outcome`. */
class Refused extends Error {
  constructor(readonly outcome: RegisterOutcome) {
    super("registration refused");
  }
}

async function explainUnusableInvite(
  tx: Prisma.TransactionClient,
  code: string,
): Promise<string> {
  const invite = await tx.registrationInvite.findUnique({
    where: { code },
    select: { usedAt: true },
  });
  if (!invite) return "This invitation code is not valid.";
  if (invite.usedAt) return "This invitation link has already been used.";
  return "This invitation link has expired.";
}

/**
 * Spends the invite and creates the account, both or neither. Claiming in the
 * same transaction means a link can never be spent twice, and any refusal —
 * someone else's addressed invite, an address already registered — releases
 * it instead of burning it. `email` and `name` arrive normalised.
 */
export async function registerWithInvite(input: {
  code: string;
  email: string;
  name: string;
  passwordHash: string;
}): Promise<RegisterOutcome> {
  try {
    return await prisma.$transaction(async (tx) => {
      const now = new Date();
      const [invite] = await tx.registrationInvite.updateManyAndReturn({
        where: { code: input.code, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
        select: { createdBy: true, role: true, email: true },
      });

      if (!invite) {
        throw new Refused({
          ok: false,
          reason: "invite",
          error: await explainUnusableInvite(tx, input.code),
        });
      }

      const claimant = claimantMatches(invite.email, input.email);
      if (!claimant.ok) {
        throw new Refused({ ok: false, reason: "claimant", error: claimant.error });
      }

      const role: InviteRole = isInviteRole(invite.role) ? invite.role : "USER";
      const user = await tx.user.create({
        data: {
          email: input.email,
          password: input.passwordHash,
          name: input.name,
          role,
          managerId: managerForInvite(role, invite.createdBy),
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          managerId: true,
          createdAt: true,
        },
      });

      return { ok: true as const, user };
    });
  } catch (error) {
    if (error instanceof Refused) return error.outcome;
    // unique_violation on users.email
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, reason: "email-taken" };
    }
    throw error;
  }
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test:db src/server/data/users.db.test.ts`
Expected: PASS, 21 tests.

If the email-taken test fails because the error isn't a `PrismaClientKnownRequestError` with code `P2002`, print the caught error's `name`, `code` and `meta` and match on what the adapter actually raises. Keep the check narrow to the unique violation on `users.email`, and record a ruling. Don't widen it to "any error".

- [ ] **Step 5: Write the failing route tests**

Create `src/app/api/auth/register/route.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

const { registerWithInvite } = vi.hoisted(() => ({
  registerWithInvite: vi.fn(),
}));

vi.mock("@/server/data/users", () => ({ registerWithInvite }));
vi.mock("@/lib/helper/signup-grant", () => ({
  createSignupGrant: (email: string) => `grant-for-${email}`,
}));

import { POST } from "./route";

const body = {
  email: "  New@Example.com ",
  password: "long-enough",
  name: "  New Person ",
  code: "abc",
};

function request(payload: unknown = body) {
  return new Request("http://internal.local/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

afterEach(() => vi.clearAllMocks());

describe("POST /api/auth/register", () => {
  it("answers 201 with the snake_case account and a signup grant", async () => {
    registerWithInvite.mockResolvedValue({
      ok: true,
      user: {
        id: "u1",
        email: "new@example.com",
        name: "New Person",
        role: "USER",
        managerId: "m1",
        createdAt: new Date("2026-10-14T09:00:00.000Z"),
      },
    });

    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(await response.text()).toBe(
      JSON.stringify({
        id: "u1",
        email: "new@example.com",
        name: "New Person",
        role: "USER",
        manager_id: "m1",
        created_at: "2026-10-14T09:00:00.000Z",
        signupGrant: "grant-for-new@example.com",
      }),
    );
    expect(registerWithInvite).toHaveBeenCalledWith({
      code: "abc",
      email: "new@example.com",
      name: "New Person",
      passwordHash: expect.stringMatching(/^\$2[aby]\$10\$/),
    });
  });

  it.each([
    [{ ok: false, reason: "invite", error: "This invitation link has expired." }, 400, "This invitation link has expired."],
    [{ ok: false, reason: "claimant", error: "This invitation was sent to a different email address." }, 403, "This invitation was sent to a different email address."],
    [{ ok: false, reason: "email-taken" }, 409, "Email already registered"],
  ])("maps %o to %i", async (outcome, status, error) => {
    registerWithInvite.mockResolvedValue(outcome);

    const response = await POST(request());

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error });
  });

  it("answers 500 when the database fails", async () => {
    registerWithInvite.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to register user" });
  });
});
```

Create `src/app/api/invites/route.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { auth, emailHasAccount, createInvite, sendMail, mailerConfigured } =
  vi.hoisted(() => ({
    auth: vi.fn(),
    emailHasAccount: vi.fn(),
    createInvite: vi.fn(),
    sendMail: vi.fn(),
    mailerConfigured: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/app/api/_lib/presence-store", () => ({ touchLastSeen: vi.fn() }));
vi.mock("@/server/data/users", () => ({ emailHasAccount, createInvite }));
vi.mock("@/lib/mailer", () => ({ sendMail, mailerConfigured }));

import { POST } from "./route";

const EXPIRES = new Date("2026-10-21T09:00:00.000Z");

function request(payload?: unknown) {
  return new Request("http://internal.local/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
}

beforeEach(() => {
  vi.stubEnv("APP_URL", "https://insure.example.com");
  auth.mockResolvedValue({
    user: { id: "admin-1", role: "ADMIN", name: "Sam" },
  });
  emailHasAccount.mockResolvedValue(false);
  createInvite.mockImplementation(
    async (input: { code: string; role: string; email: string | null }) => ({
      code: input.code,
      expiresAt: EXPIRES,
      role: input.role,
      email: input.email,
    }),
  );
  mailerConfigured.mockReturnValue(true);
  sendMail.mockResolvedValue({ sent: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST /api/invites", () => {
  it("returns the open link in today's snake_case shape", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(Object.keys(body)).toEqual(["code", "expires_at", "role", "email", "link"]);
    expect(body).toMatchObject({
      expires_at: "2026-10-21T09:00:00.000Z",
      role: "USER",
      email: null,
      link: `https://insure.example.com/signup?code=${encodeURIComponent(body.code)}`,
    });
    expect(createInvite).toHaveBeenCalledWith({
      code: expect.any(String),
      createdBy: "admin-1",
      role: "USER",
      email: null,
    });
  });

  it("emails an addressed invite and reports how it went", async () => {
    const response = await POST(
      request({ role: "MANAGER", email: " Lead@Example.com " }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(emailHasAccount).toHaveBeenCalledWith("lead@example.com");
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(body).toMatchObject({
      role: "MANAGER",
      email: "lead@example.com",
      sent: true,
      mailerConfigured: true,
    });
  });

  it("refuses an address that already has an account", async () => {
    emailHasAccount.mockResolvedValue(true);

    const response = await POST(
      request({ role: "MANAGER", email: "taken@example.com" }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "That email already has an account.",
    });
    expect(createInvite).not.toHaveBeenCalled();
  });
});
```

Run: `pnpm test src/app/api/auth/register src/app/api/invites`
Expected: FAIL. Both routes still call `pool.query` / `pool.connect`, which nothing mocks.

- [ ] **Step 6: Rewire `invites/route.ts`**

Replace `import pool from "@/lib/db";` with:

```ts
import { createInvite, emailHasAccount } from "@/server/data/users";
```

Replace the body of the `try` from `if (email) {` up to and including `const invite = result.rows[0];` with:

```ts
    if (email && (await emailHasAccount(email))) {
      return NextResponse.json(
        { error: "That email already has an account." },
        { status: 409 },
      );
    }

    // A second invite to the same person replaces the first, so an address
    // never ends up holding two live links to spend.
    const created = await createInvite({
      code: randomBytes(16).toString("base64url"),
      createdBy: currentUserId,
      role,
      email,
    });

    const invite = {
      code: created.code,
      expires_at: created.expiresAt,
      role: created.role,
      email: created.email,
    };
```

Everything after that, from `// Built on the app's own address` onward, stays as it is.

- [ ] **Step 7: Rewire `auth/register/route.ts`**

Replace the whole file with:

```ts
import { registerBodySchema } from "@/lib/validation/auth.validation";
import { registerWithInvite } from "@/server/data/users";
import bcrypt from "bcryptjs";
import { createSignupGrant } from "@/lib/helper/signup-grant";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const parsed = registerBodySchema.safeParse(
      await req.json().catch(() => null),
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { email, password, name, code } = parsed.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Claiming the invite and creating the account happen in one
    // transaction: a link can never be spent twice, and a refused signup
    // releases it instead of burning it.
    const outcome = await registerWithInvite({
      code,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      passwordHash: hashedPassword,
    });

    if (!outcome.ok) {
      if (outcome.reason === "email-taken") {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 409 },
        );
      }
      // An addressed invite belongs to one person; any other refusal is the
      // code itself.
      return NextResponse.json(
        { error: outcome.error },
        { status: outcome.reason === "claimant" ? 403 : 400 },
      );
    }

    const { user } = outcome;

    // The signup form signs the new account in straight away, and the
    // credentials provider wants a bot check it has no widget to satisfy.
    // This stands in for one, for this address, for the next two minutes.
    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        manager_id: user.managerId,
        created_at: user.createdAt,
        signupGrant: createSignupGrant(user.email),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error registering user:", error);
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 8: Run the route tests and confirm they pass**

Run: `pnpm test src/app/api/auth/register src/app/api/invites`
Expected: PASS (register: 5, invites: 3).

- [ ] **Step 9: Typecheck, lint, full unit and DB suites**

Run: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`. Expected: all clean, and the DB suite includes the 21 users tests.

- [ ] **Step 10: Commit**

```bash
git add src/server/data/users.ts src/server/data/users.db.test.ts src/app/api/invites src/app/api/auth/register
git commit -m "refactor: create invites and register accounts through the users module"
```

---

### Task 5: Delete `GET /api/user`, verify the wave, record the outcome

**Files:**
- Delete: `src/app/api/user/route.ts`
- Modify: `docs/superpowers/specs/2026-10-14-prisma-migration-design.md`

**Interfaces:**
- Consumes: everything above.
- Produces: no `@/lib/db` import is left in any Wave 1 file.

- [ ] **Step 1: Confirm nothing calls it**

Run: `git grep -nE "[\"'\`]/api/user[\"'\`?]" -- src`
Expected: no matches. (`/api/user/avatar` and `/api/user/tour` don't match because the pattern needs a quote or `?` right after `user`.) If anything matches, stop and report it.

- [ ] **Step 2: Delete the route**

```bash
git rm src/app/api/user/route.ts
```

- [ ] **Step 3: Confirm Wave 1 no longer touches `pg`**

Run: `git grep -l "@/lib/db" -- src/lib/auth.ts src/app/api/auth src/app/api/user src/app/api/invites`
Expected: no output.

- [ ] **Step 4: Full verification**

Run each command and record its result line in the ledger:
- `pnpm typecheck` → exit 0
- `pnpm lint` → 0 errors
- `pnpm test` → all pass
- `pnpm test:db` → all pass
- `pnpm build` → exit 0

The manual `pnpm dev` pass: ask Nelson whether to do it, and how. The local `insure_dev` holds real people's accounts from the production restore, so don't sign in as any of them.

- [ ] **Step 5: Record the outcome in the spec**

In `docs/superpowers/specs/2026-10-14-prisma-migration-design.md`, change the status line to:

```markdown
**Status:** approved; Waves 0–1 implemented (see Wave 0 and Wave 1 outcomes)
```

and append this section at the end, adjusted to match what actually happened (rulings from the ledger, plus anything that surprised you):

```markdown
## Wave 1 outcome (2026-10-14)

- **`src/server/data/users.ts`** holds every account query: sign-in, session
  claims, avatar, tours, reset tokens, invites and registration. Routes map
  its camelCase results back to the old snake_case JSON; route tests pin
  register and invites byte for byte.
- **Transactions.** Registration claims the invite and inserts the user in
  one interactive transaction. A refusal throws inside it, so the claim is
  rolled back, and a duplicate email (Prisma `P2002`) releases the invite.
  Reset spends the token and sets the password together. Issuing a reset
  link and replacing an addressed invite are now atomic as well; before,
  they were two separate statements.
- **Clock.** Expiry checks that used Postgres's `now()` use the app's clock.
  With UTC sessions, the only difference is host clock skew.
- **`GET /api/user`** is deleted.
- **Connection budget** is unchanged at 3 + 2.
```

- [ ] **Step 6: Commit**

```bash
git add -A src/app/api/user docs/superpowers/specs/2026-10-14-prisma-migration-design.md
git commit -m "chore: delete the unused user aggregate and record what Wave 1 found"
```
