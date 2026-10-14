# Prisma Wave 0 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up Prisma beside the existing `pg` pool, baseline the live schema without touching it, and replace the mastery-counting SQL with one view-backed module that the dashboard, eligibility and roster all read.

**Architecture:** `prisma db pull` produces the schema, renamed to readable names with `@map`. A hand-checked `0_init` migration records the baseline and is only marked as applied. Two additive SQL views hold the mastery counts. `src/server/data/mastery.ts` reads them with typed `$queryRaw`, and a pure helper turns the rows into per-track counts. Routes keep their response shapes exactly.

**Tech Stack:** Next.js 16 route handlers, Prisma 7 (`prisma-client` generator, `@prisma/adapter-pg`), PostgreSQL, Vitest 4, tsx.

**Spec:** `docs/superpowers/specs/2026-10-14-prisma-migration-design.md`

## Global Constraints

- **Existing data is never affected.** Every migration is additive. No `DROP`, `ALTER ... TYPE`, `RENAME`, or `UPDATE`/`DELETE` of existing rows. Any migration SQL Prisma generates is read line by line before it's applied, and any statement touching an existing object stops the task.
- **Never touch the Railway database.** No `prisma db push`, `migrate dev`, `migrate deploy`, `migrate resolve` or `migrate reset` against it, and no `node scripts/migrate.cjs`. `.env` holds the production `DATABASE_URL`. **Never read it, and never pass it to any command.**
- **Local database URLs come from Nelson.** Ask for them at Task 2, Step 1, and don't guess them. They go in `.env.local`, which is gitignored:
  - `MIGRATE_DATABASE_URL`: the local dev copy (with the restored Railway schema and data)
  - `DATABASE_URL`: the same local dev copy, so `pnpm dev` reads it instead of `.env`
  - `TEST_DATABASE_URL`: a separate, empty local database that tests reset freely
- **Prisma CLI reads only `MIGRATE_DATABASE_URL`**, and `prisma.config.ts` refuses any non-local host unless `ALLOW_REMOTE_MIGRATE=1`. Only Nelson sets that, in production, after merge.
- **Response shapes stay identical.** The only intended output difference in this wave is the roster `lastActivity` fix (Task 11).
- **Commits:** plain messages, sole author Nelson Lago III. **No `Co-Authored-By` or any other trailer.**
- **PR:** `gh pr create --base dev`. Never `main`.
- **Next.js:** this repo's Next 16 differs from older docs. Read `node_modules/next/dist/docs/` before changing any Next-specific API. This plan only edits route handler bodies.
- **Package manager:** pnpm only. Never run `npm install` (it creates a second React copy; see `.gitignore`).

## Review Focus

1. **Generated migration that drops something:** a future `prisma migrate dev` may emit `DROP INDEX "users_active_idx"` (a partial index Prisma can't model) or try to drop the views. Expected: the hand-written migration process in Task 3 never applies generated SQL unread. Pinned by the schema-diff check in Task 3, Step 6.
2. **Invalid `exam_type` query string** (`?exam_type=FOO`) on the eligibility routes. Today this is a Postgres enum error and a 500. Expected: a clean 400 `{ error }`. Pinned by route tests in Task 9.
3. **Reviewee with no progress rows at all:** every track must report zero mastered against the real totals, not disappear. Pinned in Task 7 (`buildTrackCounts` with undefined progress) and Task 8 (DB test with an untouched user).
4. **Track with content in only one kind** (questions but no flashcards/memorization): `api/progress` lists it, but `fetchAllEligibility` must not, matching today. Pinned in Task 9's unit test of `eligibleTracks`.
5. **Timestamps crossing the API:** `last_activity_at` must stay an ISO string, and roster `lastActivity` must pick the most recent instant. Pinned in Task 7 (`latestActivity`) and the parity script in Task 12.

---

## File Map

| Path | Responsibility |
| ---- | -------------- |
| `src/server/db/local-guard.ts` | Pure: is a Postgres URL local; refuse remote unless allowed |
| `prisma.config.ts` | Prisma CLI config; reads `MIGRATE_DATABASE_URL` through the guard |
| `prisma/schema.prisma` | Introspected schema, readable names, `@map`ped |
| `prisma/migrations/0_init/migration.sql` | Baseline; marked applied, never run on a populated DB |
| `prisma/migrations/20261014000100_mastery_views/migration.sql` | The two views |
| `prisma/seed.ts` | Glossary upsert (moved from `scripts/migrate.cjs`) |
| `src/server/db/prisma.ts` | The one Prisma client (server-only) |
| `src/lib/db.ts` | Modified: `max: 3`, TLS off for local hosts |
| `src/lib/helper/track-counts.ts` | Pure: rows → `TrackCounts`; `latestActivity`; `eligibleTracks` |
| `src/server/data/mastery.ts` | Only reader of the views |
| `src/app/api/_lib/mastery.ts` | Rewired onto `server/data/mastery` |
| `src/app/api/progress/route.ts`, `attempts/eligibility`, `attempts/route.ts`, `flashcards/eligibility`, `memorization/eligibility`, `admin/reviewees` | Rewired |
| `src/lib/types/common.ts` | Adds `isExamType` |
| `src/test/server-only-stub.ts`, `src/test/db-global-setup.ts`, `src/test/db-setup.ts`, `src/test/db-fixtures.ts` | Test infrastructure for `*.db.test.ts` |
| `scripts/parity/mastery-parity.ts` | Old SQL vs new module, on the local DB |
| `src/migration/archive/` | The old `.sql` files and `migrate.cjs`, moved unchanged |

---

### Task 1: Local database guard

**Files:**
- Create: `src/server/db/local-guard.ts`
- Test: `src/server/db/local-guard.test.ts`

**Interfaces:**
- Produces: `isLocalDatabase(url: string): boolean`; `assertLocalDatabase(url: string | undefined, options?: { allowRemote?: boolean }): string` (returns the URL, throws otherwise). No imports, no `server-only`, because `prisma.config.ts` and scripts load it.

- [ ] **Step 1: Write the failing test**

```ts
// src/server/db/local-guard.test.ts
import { describe, expect, it } from "vitest";
import { assertLocalDatabase, isLocalDatabase } from "./local-guard";

describe("isLocalDatabase", () => {
  it.each([
    "postgresql://postgres:pw@localhost:5432/insureprep_dev",
    "postgresql://postgres:pw@127.0.0.1/insureprep_test",
    "postgres://u@[::1]:5432/db",
    "postgresql://u:pw@db.localhost:5432/db",
  ])("accepts %s", (url) => {
    expect(isLocalDatabase(url)).toBe(true);
  });

  it.each([
    "postgresql://postgres:pw@containers.railway.app:6543/railway",
    "postgresql://u:pw@localhost.evil.com/db",
    "postgresql://u:pw@10.0.0.5/db",
    "not a url",
    "",
  ])("rejects %s", (url) => {
    expect(isLocalDatabase(url)).toBe(false);
  });
});

describe("assertLocalDatabase", () => {
  it("returns a local URL unchanged", () => {
    const url = "postgresql://u@localhost/db";
    expect(assertLocalDatabase(url)).toBe(url);
  });

  it("refuses a missing URL", () => {
    expect(() => assertLocalDatabase(undefined)).toThrow(/not set/);
  });

  it("refuses a remote URL without naming its credentials", () => {
    const url = "postgresql://postgres:s3cret@containers.railway.app/railway";
    expect(() => assertLocalDatabase(url)).toThrow(/containers\.railway\.app/);
    expect(() => assertLocalDatabase(url)).not.toThrow(/s3cret/);
  });

  it("allows a remote URL only when asked to", () => {
    const url = "postgresql://u@containers.railway.app/railway";
    expect(assertLocalDatabase(url, { allowRemote: true })).toBe(url);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/server/db/local-guard.test.ts`
Expected: FAIL, `Failed to resolve import "./local-guard"`.

- [ ] **Step 3: Implement**

```ts
// src/server/db/local-guard.ts

/**
 * Whether a Postgres URL points at this machine.
 *
 * The Prisma CLI, the test setup and the parity script all run against a
 * database here and never against Railway, and `.env` holds the Railway URL.
 * Checking the host rather than trusting a variable name is what stops a
 * copied line from pointing a reset at production.
 */
export function isLocalDatabase(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host.endsWith(".localhost")
  );
}

/** Returns the URL when it is local (or remote is allowed); throws otherwise. */
export function assertLocalDatabase(
  url: string | undefined,
  options: { allowRemote?: boolean } = {},
): string {
  if (!url) {
    throw new Error("Database URL is not set.");
  }
  if (options.allowRemote || isLocalDatabase(url)) {
    return url;
  }
  let host = "an unparseable URL";
  try {
    host = new URL(url).hostname;
  } catch {}
  throw new Error(
    `Refusing to use the database at ${host}: only a local database is allowed here.`,
  );
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `pnpm vitest run src/server/db/local-guard.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/db/local-guard.ts src/server/db/local-guard.test.ts
git commit -m "feat: guard Prisma tooling to local databases"
```

---

### Task 2: Install Prisma and introspect the schema

**Files:**
- Create: `prisma.config.ts`, `prisma/schema.prisma`, `src/test/server-only-stub.ts`
- Modify: `package.json`, `.gitignore`, `eslint.config.mjs`, `vitest.config.mts`

**Interfaces:**
- Consumes: `assertLocalDatabase` (Task 1).
- Produces: the generated client at `src/generated/prisma` (import `PrismaClient`, `Prisma` from `@/generated/prisma/client`). Model, field and enum names follow the naming table below. **Every later task relies on these exact names.**

- [ ] **Step 1: Ask Nelson for the local databases**

Stop and ask, in chat:

> "I'm at the step that needs a database. Please set up two local Postgres databases and paste their URLs (they'll only go in `.env.local`):
> 1. a **dev copy**, with Railway's schema and data restored into it (`pg_dump` from Railway, then `pg_restore`/`psql` locally; you run the dump, I won't connect to Railway), and
> 2. an **empty test database** the tests can wipe.
> Both must be on `localhost`."

When they reply, write `.env.local` (create it, or append if it exists; it's gitignored). Do not read or edit `.env`:

```
DATABASE_URL="<dev copy URL>"
MIGRATE_DATABASE_URL="<dev copy URL>"
TEST_DATABASE_URL="<test database URL>"
```

The quotes keep shells from splitting on `&` or `?` when later steps load the file with `set -a; . ./.env.local; set +a`. Step 2 ends by confirming all three are local.

- [ ] **Step 2: Install**

If Nelson already ran these, `pnpm install` is enough; check `package.json` first.

```bash
pnpm add @prisma/client @prisma/adapter-pg server-only
pnpm add -D prisma tsx
```

Confirm the three URLs are local:

```bash
set -a; . ./.env.local; set +a
pnpm exec tsx -e "import { assertLocalDatabase } from './src/server/db/local-guard'; for (const k of ['DATABASE_URL','MIGRATE_DATABASE_URL','TEST_DATABASE_URL']) assertLocalDatabase(process.env[k]); console.log('all local')"
```

Expected: `all local`. Anything else: stop and ask Nelson.

Check the installed major: `pnpm exec prisma --version`. This plan is written for Prisma 7. On 6.x, the generator and config syntax below still apply, but in Step 5 replace `--to-schema` with `--to-schema-datamodel`.

- [ ] **Step 3: Write `prisma.config.ts`**

```ts
// prisma.config.ts
import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { assertLocalDatabase } from "./src/server/db/local-guard";

// Only .env.local, never .env: .env carries the production URL.
config({ path: ".env.local" });

/**
 * The CLI reads MIGRATE_DATABASE_URL and nothing else, so a migrate or reset
 * can never pick up the app's DATABASE_URL by accident. A non-local host is
 * refused unless ALLOW_REMOTE_MIGRATE=1, which is set by hand for the
 * production checklist and nowhere else. `prisma generate` needs no URL, so
 * a missing one is allowed: the build still generates the client.
 */
const url = process.env.MIGRATE_DATABASE_URL;
if (url) {
  assertLocalDatabase(url, {
    allowRemote: process.env.ALLOW_REMOTE_MIGRATE === "1",
  });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  ...(url ? { datasource: { url } } : {}),
});
```

- [ ] **Step 4: Write the schema header and introspect**

Create `prisma/schema.prisma` containing only:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

Run: `pnpm exec prisma db pull`
Expected: `Introspected N models and wrote them into prisma/schema.prisma`. Any warnings about the partial index `users_active_idx` or the `set_updated_at` trigger are expected. Copy the warnings into the commit message body.

- [ ] **Step 5: Rename to readable names**

Edit the pulled schema by hand. **Only names change. Never a type, default, index or relation action.** Rules:

- **Models:** singular PascalCase plus `@@map("<table>")`:

| Table | Model | Table | Model |
|---|---|---|---|
| `users` | `User` | `exam_attempts` | `ExamAttempt` |
| `questions` | `Question` | `exam_attempt_answers` | `ExamAttemptAnswer` |
| `choices` | `Choice` | `user_progress` | `UserProgress` |
| `flashcards` | `Flashcard` | `certificates` | `Certificate` |
| `flashcard_progress` | `FlashcardProgress` | `question_progress` | `QuestionProgress` |
| `vocabulary_terms` | `VocabularyTerm` | `memorization` | `Memorization` |
| `memorization_choices` | `MemorizationChoice` | `memorization_progress` | `MemorizationProgress` |
| `registration_invites` | `RegistrationInvite` | `password_reset_tokens` | `PasswordResetToken` |
| `study_streaks` | `StudyStreak` | `study_sessions` | `StudySession` |
| `recent_activity` | `RecentActivity` | `nudges` | `Nudge` |
| `admin_actions` | `AdminAction` | | |

  Any table not listed: same rule.
- **Enums:** `exam_type` → `ExamType @@map("exam_type")`, `user_role` → `UserRole`, `attempt_type` → `AttemptType`. Values keep their exact spelling, including any legacy value such as `IIAP`.
- **Scalar fields:** camelCase plus `@map("<column>")` whenever the name changes: `user_id` → `userId @map("user_id")`, `exam_type` → `examType`, `certificate_no` → `certificateNo`, `total_items` → `totalItems`, `is_correct` → `isCorrect`, `reviewed_at` → `reviewedAt`, and so on. Single-word columns (`id`, `email`, `name`, `mastered`) stay as they are.
- **Relation fields:** named after what they point to. `user`/`users` on child models; on `User`: `manager User? @relation("Recruits", ...)` and `recruits User[] @relation("Recruits")`; on `Nudge`: `user` and `sender`; on `AdminAction`: `actor` and `target`. Keep each `onDelete` exactly as pulled.
- **Compound uniques** keep their `map:` names. After renaming, `vocabulary_terms`' unique index reads `@@unique([examType, term], map: "vocabulary_terms_exam_term_key")`.

Then run: `pnpm exec prisma validate` → `The schema at prisma/schema.prisma is valid`.
Then: `pnpm exec prisma generate` → `Generated Prisma Client ... to ./src/generated/prisma`.

- [ ] **Step 6: Wire scripts and ignores**

`package.json` scripts (keep the others):

```json
"postinstall": "prisma generate",
"test": "vitest run --project unit",
"test:db": "vitest run --project db",
"parity": "tsx --conditions=react-server scripts/parity/mastery-parity.ts",
"migrate": "prisma migrate deploy"
```

`.gitignore`, appended:

```
# Prisma's generated client; rebuilt by `prisma generate` on install
src/generated/
```

`eslint.config.mjs`: add `"src/generated/**"` to the `ignores` array.

`src/test/server-only-stub.ts`:

```ts
// Vitest runs outside React's server environment, where the real
// `server-only` throws on import. Tests alias it to this empty module.
export {};
```

`vitest.config.mts`, replace the whole file:

```ts
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

// TEST_DATABASE_URL comes from .env.local. It is the only variable read here:
// the db project points DATABASE_URL at it so data modules under test never
// see another database.
const testDatabaseUrl = loadEnv("test", process.cwd(), "").TEST_DATABASE_URL;

export default defineConfig({
  // The app imports through the "@/..." alias, so the tests resolve it the
  // same way tsconfig does.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./src/test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/**/*.db.test.ts", "node_modules/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          include: ["src/**/*.db.test.ts"],
          globalSetup: ["./src/test/db-global-setup.ts"],
          setupFiles: ["./src/test/db-setup.ts"],
          fileParallelism: false,
          env: testDatabaseUrl ? { DATABASE_URL: testDatabaseUrl } : {},
        },
      },
    ],
  },
});
```

- [ ] **Step 7: Verify**

Run: `pnpm typecheck` → no errors.
Run: `pnpm test` → all existing unit tests pass. Task 1's tests are included in the unit project.
Run: `pnpm lint` → no new errors.

- [ ] **Step 8: Commit**

```bash
git add prisma.config.ts prisma/schema.prisma package.json pnpm-lock.yaml .gitignore eslint.config.mjs vitest.config.mts src/test/server-only-stub.ts
git commit -m "chore: introspect the schema into Prisma with readable names"
```

---

### Task 3: Baseline migration, proven equal to the live schema

**Files:**
- Create: `prisma/migrations/0_init/migration.sql`, `prisma/migrations/migration_lock.toml` (written by Prisma)

**Interfaces:**
- Produces: a migrations folder whose replay on an empty database yields the same schema as the dev copy. Tasks 5–12 and Plan 2 build on it.

- [ ] **Step 1: Generate the baseline SQL**

```bash
mkdir -p prisma/migrations/0_init
pnpm exec prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
```

Write `prisma/migrations/migration_lock.toml`:

```toml
provider = "postgresql"
```

- [ ] **Step 2: Add what Prisma cannot model**

At the **top** of `0_init/migration.sql`:

```sql
-- Objects Prisma's schema cannot express, copied from the live database so a
-- fresh database built from these migrations matches it exactly.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

At the **bottom**:

```sql
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_progress_updated_at BEFORE UPDATE ON user_progress
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS users_active_idx ON users (id) WHERE deleted_at IS NULL;
```

Check the exact trigger and function bodies against the live definitions. Read them from the dev copy with `pg_dump --schema-only "$MIGRATE_DATABASE_URL" | grep -A6 -E "FUNCTION|TRIGGER"` and match them character for character.

- [ ] **Step 3: Build a fresh database from the migrations**

Point the CLI at the **test** database for this one command:

```bash
MIGRATE_DATABASE_URL="$TEST_DATABASE_URL" pnpm exec prisma migrate reset --force
```

(Load `.env.local` first: `set -a; . ./.env.local; set +a`.) The guard in `prisma.config.ts` rejects anything that isn't local.
Expected: `Database reset successful` and `0_init` applied.

- [ ] **Step 4: Diff the two schemas**

```bash
pg_dump --schema-only --no-owner --no-privileges "$MIGRATE_DATABASE_URL" | grep -v '^--' | sed '/^$/d' > /tmp/dev-schema.sql
pg_dump --schema-only --no-owner --no-privileges --exclude-table=_prisma_migrations "$TEST_DATABASE_URL" | grep -v '^--' | sed '/^$/d' > /tmp/fresh-schema.sql
diff /tmp/dev-schema.sql /tmp/fresh-schema.sql
```

(Use the session scratchpad directory instead of `/tmp` on Windows.)
Expected: **no output**. Each difference is something missing from or extra in `0_init`. Fix `0_init/migration.sql` (never the dev database), then repeat Steps 3–4 until the diff is empty. Constraint and index *names* must match, since Prisma's defaults sometimes differ: use `map:` in the schema, regenerate, and re-add Step 2's block.

- [ ] **Step 5: Mark the baseline applied on the dev copy**

```bash
pnpm exec prisma migrate resolve --applied 0_init
pnpm exec prisma migrate status
```

Expected: `Database schema is up to date!`. This writes only the `_prisma_migrations` bookkeeping table in the **local** dev copy. No schema change.

- [ ] **Step 6: Prove Prisma sees no drift**

```bash
pnpm exec prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script --shadow-database-url "$TEST_DATABASE_URL"
```

Expected: an empty script, or only `DROP INDEX "users_active_idx"` and trigger/function lines. **Write down any such lines in the migration's README** (Step 7). Every future generated migration has to have them removed by hand.

- [ ] **Step 7: Document and commit**

Create `prisma/migrations/README.md`:

```md
# Migrations

`0_init` is the baseline of the database as it stood on 2026-10-14. On any
database that already has the tables it is marked applied
(`prisma migrate resolve --applied 0_init`), never run.

Prisma cannot model the partial index `users_active_idx`, the `pgcrypto`
extension, or the `set_updated_at` trigger, so they were added to `0_init`
by hand. A generated migration may try to drop them, or the mastery views:
always generate with `--create-only`, read every line, and delete any
`DROP` of an object that already exists before applying.

Every migration here is additive. See the ground rules in
`docs/superpowers/specs/2026-10-14-prisma-migration-design.md`.
```

```bash
git add prisma/migrations
git commit -m "chore: baseline the existing schema as 0_init"
```

---

### Task 4: Archive the old migrations and port the glossary seed

**Files:**
- Move: `src/migration/*.sql` → `src/migration/archive/`, `scripts/migrate.cjs` → `src/migration/archive/migrate.cjs`
- Create: `prisma/seed.ts`
- Modify: `README.md` (scripts table and migration notes)

**Interfaces:**
- Consumes: `VocabularyTerm` model with `examType`, `term`, `definition`, `details` and the compound unique `examType_term` (Task 2).

- [ ] **Step 1: Move the files unchanged**

```bash
mkdir -p src/migration/archive
git mv src/migration/*.sql src/migration/archive/
git mv scripts/migrate.cjs src/migration/archive/migrate.cjs
```

- [ ] **Step 2: Write the seed**

```ts
// prisma/seed.ts
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import type { ExamType } from "../src/generated/prisma/client";
import {
  assertLocalDatabase,
  isLocalDatabase,
} from "../src/server/db/local-guard";
import seedTerms from "../scripts/glossary-seed.cjs";

config({ path: ".env.local" });

type SeedTerm = {
  exam_type: ExamType;
  term: string;
  definition: string;
  details?: Prisma.InputJsonValue | null;
};

const url = assertLocalDatabase(process.env.MIGRATE_DATABASE_URL, {
  allowRemote: process.env.ALLOW_REMOTE_MIGRATE === "1",
});

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: url,
    ssl: isLocalDatabase(url) ? false : { rejectUnauthorized: false },
  }),
});

/**
 * The glossary as its source document has it. Upserted on (exam_type, term),
 * so a reseed updates a term in place rather than adding a second copy.
 */
async function main() {
  for (const seed of seedTerms as SeedTerm[]) {
    const details = seed.details ?? Prisma.DbNull;
    await prisma.vocabularyTerm.upsert({
      where: { examType_term: { examType: seed.exam_type, term: seed.term } },
      create: {
        examType: seed.exam_type,
        term: seed.term,
        definition: seed.definition,
        details,
      },
      update: { definition: seed.definition, details },
    });
  }
  console.log(`ok  seeded ${seedTerms.length} vocabulary terms`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
```

If TypeScript complains about importing a `.cjs` file, add `prisma/glossary-seed.d.ts` with `declare module "*.cjs" { const value: unknown[]; export default value; }`.

- [ ] **Step 3: Run it against the test database, twice**

```bash
MIGRATE_DATABASE_URL="$TEST_DATABASE_URL" pnpm exec prisma db seed
MIGRATE_DATABASE_URL="$TEST_DATABASE_URL" pnpm exec prisma db seed
psql "$TEST_DATABASE_URL" -c "SELECT count(*) FROM vocabulary_terms"
```

Expected: both runs print `ok  seeded N vocabulary terms`, and the count equals N, not 2N.

- [ ] **Step 4: Update the README**

In the scripts table, replace the `migrate` row with:

```md
| `pnpm migrate`   | Apply pending Prisma migrations (`prisma migrate deploy`) to `MIGRATE_DATABASE_URL`; local only unless `ALLOW_REMOTE_MIGRATE=1` |
| `pnpm test:db`   | Data-layer tests against `TEST_DATABASE_URL` (reset each run) |
| `pnpm parity`    | Compare the old mastery SQL with the new module on the local DB |
```

Add one sentence under it: `Old migrations live in src/migration/archive/ for history; schema changes now go through prisma/migrations (see its README).` In the `seed-*.cjs` lines, add nothing (they are ported in Wave 5).

- [ ] **Step 5: Commit**

```bash
git add -A src/migration scripts prisma/seed.ts README.md
git commit -m "chore: archive hand-applied migrations and seed the glossary through Prisma"
```

---

### Task 5: Prisma client, pool budget, and DB test harness

**Files:**
- Create: `src/server/db/prisma.ts`, `src/test/db-global-setup.ts`, `src/test/db-setup.ts`, `src/test/db-fixtures.ts`
- Modify: `src/lib/db.ts:24-39`
- Test: `src/server/db/prisma.db.test.ts`

**Interfaces:**
- Consumes: `isLocalDatabase`, `assertLocalDatabase` (Task 1); generated client (Task 2); `0_init` (Task 3).
- Produces: `import prisma from "@/server/db/prisma"` (default export, `PrismaClient`). Fixtures: `createUser(overrides?: { role?: "USER" | "MANAGER" | "ADMIN"; managerId?: string }): Promise<{ id: string; email: string }>`, `deleteUsers(...ids: string[]): Promise<void>`, `uniqueSuffix(): string`.

- [ ] **Step 1: Write the harness**

```ts
// src/test/db-global-setup.ts
import { execSync } from "node:child_process";
import { loadEnv } from "vite";
import { assertLocalDatabase } from "../server/db/local-guard";

/**
 * Rebuilds the test database from prisma/migrations before the db project
 * runs, so every run starts empty and proves the migrations replay cleanly.
 * Refuses anything but a local database: this command drops every table.
 */
export default function setup() {
  const url = assertLocalDatabase(
    loadEnv("test", process.cwd(), "").TEST_DATABASE_URL,
  );
  execSync("pnpm exec prisma migrate reset --force", {
    stdio: "inherit",
    env: { ...process.env, MIGRATE_DATABASE_URL: url },
  });
}
```

```ts
// src/test/db-setup.ts
import { afterAll } from "vitest";
import { assertLocalDatabase } from "@/server/db/local-guard";
import prisma from "@/server/db/prisma";

// Belt and braces: the data modules read DATABASE_URL, and in this project it
// must be the local test database.
assertLocalDatabase(process.env.DATABASE_URL);

afterAll(async () => {
  await prisma.$disconnect();
});
```

```ts
// src/test/db-fixtures.ts
import { randomUUID } from "node:crypto";
import prisma from "@/server/db/prisma";

export const uniqueSuffix = () => randomUUID().slice(0, 8);

export async function createUser(
  overrides: {
    role?: "USER" | "MANAGER" | "ADMIN";
    managerId?: string;
  } = {},
) {
  const suffix = uniqueSuffix();
  return prisma.user.create({
    data: {
      email: `test-${suffix}@example.test`,
      password: "not-a-real-hash",
      name: `Test ${suffix}`,
      role: overrides.role ?? "USER",
      managerId: overrides.managerId ?? null,
    },
    select: { id: true, email: true },
  });
}

export async function deleteUsers(...ids: string[]) {
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
```

- [ ] **Step 2: Write the failing DB test**

```ts
// src/server/db/prisma.db.test.ts
import { describe, expect, it } from "vitest";
import prisma from "./prisma";
import { createUser, deleteUsers } from "@/test/db-fixtures";

describe("prisma client", () => {
  it("talks to the local test database", async () => {
    const [row] = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
    expect(row.ok).toBe(1);
  });

  it("round-trips a user through the mapped model", async () => {
    const user = await createUser();
    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found?.email).toBe(user.email);
    await deleteUsers(user.id);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `pnpm test:db`
Expected: the reset runs, then FAIL with `Failed to resolve import "./prisma"`.

- [ ] **Step 4: Implement the client and adjust `db.ts`**

```ts
// src/server/db/prisma.ts
import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { isLocalDatabase } from "@/server/db/local-guard";

declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * One client per server instance, cached on the global in every environment
 * for the same reason src/lib/db.ts caches its pool: a deploy that evaluates
 * this module more than once would otherwise open a fresh set of connections
 * each time.
 *
 * `max: 3` while src/lib/db.ts still exists beside it, so the two pools
 * together hold no more connections than the old one did alone. Restored to
 * 5 when db.ts is removed (Wave 5).
 */
function createClient() {
  const connectionString = process.env.DATABASE_URL ?? "";
  const adapter = new PrismaPg({
    connectionString,
    // Railway is reached through a TLS proxy whose certificate cannot be
    // verified from here; a local Postgres usually has no TLS at all.
    ssl: isLocalDatabase(connectionString)
      ? false
      : { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

const prisma = global.prisma ?? createClient();
global.prisma = prisma;

export default prisma;
```

In `src/lib/db.ts`, add `import { isLocalDatabase } from "@/server/db/local-guard";` and change the pool options. Keep the existing comments, but change the `max` sentence to note the temporary 3:

```ts
    connectionString: process.env.DATABASE_URL,
    // The managed database is reached through a TLS proxy that presents a
    // certificate for its own internal name, so the chain cannot be verified
    // from here. The connection is still encrypted. A local database for
    // development has no TLS, so none is asked for.
    ssl: isLocalDatabase(process.env.DATABASE_URL ?? "")
      ? false
      : { rejectUnauthorized: false },
    // 3 rather than 5 while the Prisma client runs beside this pool, so the
    // two together stay within the old budget. Removed with this file.
    max: 3,
```

- [ ] **Step 5: Run it to see it pass**

Run: `pnpm test:db` → PASS (2 tests). Run: `pnpm test` → PASS (unit project untouched).

- [ ] **Step 6: Commit**

```bash
git add src/server/db/prisma.ts src/server/db/prisma.db.test.ts src/lib/db.ts src/test
git commit -m "feat: add the shared Prisma client and a local database test harness"
```

---

### Task 6: Deleting a user leaves nothing behind

**Files:**
- Test: `src/server/db/user-delete.db.test.ts`

**Interfaces:**
- Consumes: `prisma`, `createUser`, `deleteUsers`, `uniqueSuffix` (Task 5).
- Produces: the test Plan 2 extends with `user_focus_tracks`. It exports nothing, but its `CASCADE_TABLES` list is where new tables get added.

- [ ] **Step 1: Write the test**

```ts
// src/server/db/user-delete.db.test.ts
import { afterAll, describe, expect, it } from "vitest";
import prisma from "./prisma";
import { createUser, deleteUsers, uniqueSuffix } from "@/test/db-fixtures";

/**
 * What a hard delete of a user must take with it, and what it must keep.
 * Nothing in the app hard-deletes today ("Remove" stamps deleted_at), but the
 * schema promises this and every new table that references users joins the
 * list below.
 */
const CASCADE_TABLES = [
  "flashcard_progress",
  "memorization_progress",
  "question_progress",
  "user_progress",
  "exam_attempts",
  "certificates",
  "study_sessions",
  "study_streaks",
  "recent_activity",
  "password_reset_tokens",
] as const;

describe("deleting a user", () => {
  const content: { flashcard?: string; memorization?: string; question?: string } = {};
  let bystander: string;

  afterAll(async () => {
    if (bystander) await deleteUsers(bystander);
    if (content.flashcard) await prisma.flashcard.delete({ where: { id: content.flashcard } });
    if (content.memorization) await prisma.memorization.delete({ where: { id: content.memorization } });
    if (content.question) await prisma.question.delete({ where: { id: content.question } });
  });

  it("removes every row they own and keeps the audit trail", async () => {
    const user = await createUser();
    bystander = (await createUser()).id;
    const s = uniqueSuffix();

    const flashcard = await prisma.flashcard.create({
      data: { examType: "VUL", category: "t", front: "f", back: "b" },
    });
    const memorization = await prisma.memorization.create({
      data: { examType: "VUL", category: "t", text: "m" },
    });
    const question = await prisma.question.create({
      data: { examType: "VUL", category: "t", text: "q" },
    });
    Object.assign(content, {
      flashcard: flashcard.id,
      memorization: memorization.id,
      question: question.id,
    });

    await prisma.flashcardProgress.create({ data: { userId: user.id, flashcardId: flashcard.id } });
    await prisma.memorizationProgress.create({ data: { userId: user.id, memorizationId: memorization.id } });
    await prisma.questionProgress.create({ data: { userId: user.id, questionId: question.id, isCorrect: true } });
    await prisma.userProgress.create({ data: { userId: user.id, examType: "VUL" } });
    const attempt = await prisma.examAttempt.create({
      data: { userId: user.id, examType: "VUL", type: "PRACTICE", score: 1, totalItems: 1, passed: true },
    });
    await prisma.examAttemptAnswer.create({ data: { attemptId: attempt.id, questionId: question.id, isCorrect: true } });
    await prisma.certificate.create({ data: { userId: user.id, examType: "VUL", certificateNo: `T-${s}` } });
    await prisma.studySession.create({ data: { userId: user.id, examType: "VUL", mode: "flashcards" } });
    await prisma.studyStreak.create({ data: { userId: user.id, examType: "VUL" } });
    await prisma.recentActivity.create({ data: { userId: user.id, examType: "VUL", mode: "flashcards" } });
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: `h-${s}`, expiresAt: new Date(Date.now() + 60_000) },
    });
    await prisma.registrationInvite.create({
      data: { code: `c-${s}`, createdBy: user.id, expiresAt: new Date(Date.now() + 60_000) },
    });
    // Received by the user: goes with them.
    await prisma.nudge.create({ data: { userId: user.id, senderId: bystander, senderName: "B", message: "hi" } });
    // Sent by the user: kept, sender cleared, name kept.
    const sent = await prisma.nudge.create({
      data: { userId: bystander, senderId: user.id, senderName: "Leaver", message: "go" },
    });
    const audit = await prisma.adminAction.create({
      data: {
        actorId: user.id, actorEmail: user.email, actorRole: "USER", action: "test",
        targetId: user.id, targetEmail: user.email, targetName: "Leaver",
      },
    });

    await deleteUsers(user.id);

    for (const table of CASCADE_TABLES) {
      const [{ count }] = await prisma.$queryRawUnsafe<{ count: number }[]>(
        `SELECT count(*)::int AS count FROM ${table} WHERE user_id = $1::uuid`,
        user.id,
      );
      expect(count, table).toBe(0);
    }
    expect(await prisma.examAttemptAnswer.count({ where: { attemptId: attempt.id } })).toBe(0);
    expect(await prisma.registrationInvite.count({ where: { createdBy: user.id } })).toBe(0);
    expect(await prisma.nudge.count({ where: { userId: user.id } })).toBe(0);

    const keptNudge = await prisma.nudge.findUniqueOrThrow({ where: { id: sent.id } });
    expect(keptNudge.senderId).toBeNull();
    expect(keptNudge.senderName).toBe("Leaver");

    const keptAudit = await prisma.adminAction.findUniqueOrThrow({ where: { id: audit.id } });
    expect(keptAudit.actorId).toBeNull();
    expect(keptAudit.targetId).toBeNull();
    expect(keptAudit.actorEmail).toBe(user.email);
    expect(keptAudit.targetName).toBe("Leaver");
  });
});
```

If Prisma reports a required field on any `create` that isn't listed here (a column added by a later migration without a default), give it a value. **Don't change the schema.**

- [ ] **Step 2: Run it**

Run: `pnpm test:db`
Expected: PASS. Behaviour already exists, so this test pins it rather than driving new code. If it fails, the schema's `onDelete` differs from the database: fix the `onDelete` in `schema.prisma` to match what `db pull` produced, and **never** alter the database.

- [ ] **Step 3: Commit**

```bash
git add src/server/db/user-delete.db.test.ts
git commit -m "test: pin what deleting a user removes and what it keeps"
```

---

### Task 7: Pure track-count helpers

**Files:**
- Create: `src/lib/helper/track-counts.ts`
- Modify: `src/lib/types/common.ts` (add `isExamType`)
- Test: `src/lib/helper/track-counts.test.ts`

**Interfaces:**
- Produces (exact):

```ts
export type ContentTotalsRow = { exam_type: string; flashcards: number; memorization: number; questions: number };
export type ProgressRow = {
  user_id: string; exam_type: string;
  flashcards_mastered: number; memorization_mastered: number;
  memorization_answered: number; memorization_correct: number;
  questions_mastered: number; attempts_taken: number; passing_attempts: number;
  last_reviewed_at: Date | null; last_answer_at: Date | null;
};
export type TrackCounts = {
  examType: ExamType;
  flashcards: MasteryCounts; memorization: MasteryCounts; practice: MasteryCounts;
  memorizationAnswered: number; memorizationCorrect: number;
  attemptsTaken: number; passingAttempts: number;
  lastReviewedAt: Date | null; lastAnswerAt: Date | null;
};
export function buildTrackCounts(examType: ExamType, totals: ContentTotalsRow | undefined, progress: ProgressRow | undefined): TrackCounts;
export function tracksWithContent(totals: ContentTotalsRow[]): ExamType[];
export function eligibleTracks(counts: TrackCounts[]): TrackCounts[];
export function latestActivity(stamps: (Date | null)[]): string | null;
// in common.ts:
export function isExamType(value: unknown): value is ExamType;
```

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/helper/track-counts.test.ts
import { describe, expect, it } from "vitest";
import { isExamType } from "@/lib/types/common";
import {
  buildTrackCounts,
  eligibleTracks,
  latestActivity,
  tracksWithContent,
  type ContentTotalsRow,
  type ProgressRow,
} from "./track-counts";

const totals = (exam_type: string, f: number, m: number, q: number): ContentTotalsRow => ({
  exam_type, flashcards: f, memorization: m, questions: q,
});

const progress: ProgressRow = {
  user_id: "u1", exam_type: "VUL",
  flashcards_mastered: 3, memorization_mastered: 2,
  memorization_answered: 4, memorization_correct: 3,
  questions_mastered: 1, attempts_taken: 6, passing_attempts: 5,
  last_reviewed_at: new Date("2026-10-01T00:00:00Z"),
  last_answer_at: new Date("2026-10-02T00:00:00Z"),
};

describe("buildTrackCounts", () => {
  it("pairs a track's totals with the user's progress", () => {
    const counts = buildTrackCounts("VUL", totals("VUL", 10, 5, 20), progress);
    expect(counts).toEqual({
      examType: "VUL",
      flashcards: { mastered: 3, total: 10 },
      memorization: { mastered: 2, total: 5 },
      practice: { mastered: 1, total: 20 },
      memorizationAnswered: 4,
      memorizationCorrect: 3,
      attemptsTaken: 6,
      passingAttempts: 5,
      lastReviewedAt: progress.last_reviewed_at,
      lastAnswerAt: progress.last_answer_at,
    });
  });

  it("scores an untouched track as nought against its real totals", () => {
    const counts = buildTrackCounts("IIAP_A", totals("IIAP_A", 8, 0, 4), undefined);
    expect(counts.flashcards).toEqual({ mastered: 0, total: 8 });
    expect(counts.practice).toEqual({ mastered: 0, total: 4 });
    expect(counts.passingAttempts).toBe(0);
    expect(counts.lastReviewedAt).toBeNull();
  });

  it("scores a track with no content as nought of nought", () => {
    const counts = buildTrackCounts("IIAP_B", undefined, undefined);
    expect(counts.flashcards).toEqual({ mastered: 0, total: 0 });
  });
});

describe("tracksWithContent", () => {
  it("lists known tracks that hold anything, in the standard order", () => {
    expect(
      tracksWithContent([
        totals("IIAP_B", 0, 0, 3),
        totals("VUL", 1, 0, 0),
        totals("IIAP", 9, 9, 9), // legacy enum value, not a track any more
      ]),
    ).toEqual(["VUL", "IIAP_B"]);
  });
});

describe("eligibleTracks", () => {
  it("drops a track whose only content is practice questions", () => {
    const onlyQuestions = buildTrackCounts("IIAP_B", totals("IIAP_B", 0, 0, 3), undefined);
    const withDecks = buildTrackCounts("VUL", totals("VUL", 1, 0, 0), undefined);
    expect(eligibleTracks([withDecks, onlyQuestions]).map((t) => t.examType)).toEqual(["VUL"]);
  });
});

describe("latestActivity", () => {
  it("picks the most recent instant, not the alphabetically last weekday", () => {
    // "Wed ..." sorts after "Thu ..." as a string; the Thursday is later.
    const wednesday = new Date("2026-10-14T09:00:00Z");
    const thursday = new Date("2026-10-15T09:00:00Z");
    expect(latestActivity([thursday, null, wednesday])).toBe(thursday.toISOString());
  });

  it("answers null when nothing has happened", () => {
    expect(latestActivity([null, null])).toBeNull();
  });
});

describe("isExamType", () => {
  it("accepts the four tracks and nothing else", () => {
    expect(isExamType("TRADITIONAL_LIFE")).toBe(true);
    expect(isExamType("IIAP")).toBe(false);
    expect(isExamType("vul")).toBe(false);
    expect(isExamType(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run src/lib/helper/track-counts.test.ts`
Expected: FAIL, unresolved import `./track-counts`.

- [ ] **Step 3: Implement**

Append to `src/lib/types/common.ts`:

```ts
/** Whether a value names one of the four tracks, for validating input. */
export function isExamType(value: unknown): value is ExamType {
  return examTypes.includes(value as ExamType);
}
```

```ts
// src/lib/helper/track-counts.ts
import type { MasteryCounts } from "@/lib/helper/readiness";
import { examTypes, isExamType, type ExamType } from "@/lib/types/common";

/** A row of the track_content_totals view. */
export type ContentTotalsRow = {
  exam_type: string;
  flashcards: number;
  memorization: number;
  questions: number;
};

/** A row of the user_track_progress view. */
export type ProgressRow = {
  user_id: string;
  exam_type: string;
  flashcards_mastered: number;
  memorization_mastered: number;
  memorization_answered: number;
  memorization_correct: number;
  questions_mastered: number;
  attempts_taken: number;
  passing_attempts: number;
  /** Latest review in any study mode: what the dashboard calls activity. */
  last_reviewed_at: Date | null;
  /** Latest answer recorded by the streak: what the roster calls activity. */
  last_answer_at: Date | null;
};

/** One user's standing on one track, before any scoring is applied. */
export type TrackCounts = {
  examType: ExamType;
  flashcards: MasteryCounts;
  memorization: MasteryCounts;
  practice: MasteryCounts;
  memorizationAnswered: number;
  memorizationCorrect: number;
  attemptsTaken: number;
  passingAttempts: number;
  lastReviewedAt: Date | null;
  lastAnswerAt: Date | null;
};

export function buildTrackCounts(
  examType: ExamType,
  totals: ContentTotalsRow | undefined,
  progress: ProgressRow | undefined,
): TrackCounts {
  return {
    examType,
    flashcards: { mastered: progress?.flashcards_mastered ?? 0, total: totals?.flashcards ?? 0 },
    memorization: { mastered: progress?.memorization_mastered ?? 0, total: totals?.memorization ?? 0 },
    practice: { mastered: progress?.questions_mastered ?? 0, total: totals?.questions ?? 0 },
    memorizationAnswered: progress?.memorization_answered ?? 0,
    memorizationCorrect: progress?.memorization_correct ?? 0,
    attemptsTaken: progress?.attempts_taken ?? 0,
    passingAttempts: progress?.passing_attempts ?? 0,
    lastReviewedAt: progress?.last_reviewed_at ?? null,
    lastAnswerAt: progress?.last_answer_at ?? null,
  };
}

/**
 * The tracks the dashboard lists: every known track holding any content, in
 * the standard order. Legacy enum values (the pre-split 'IIAP') are skipped.
 */
export function tracksWithContent(totals: ContentTotalsRow[]): ExamType[] {
  const held = new Set(
    totals
      .filter((row) => row.flashcards + row.memorization + row.questions > 0)
      .map((row) => row.exam_type),
  );
  return examTypes.filter((track) => held.has(track) && isExamType(track));
}

/**
 * The tracks the eligibility map reports: those with flashcards or
 * memorization items. A track holding only practice questions has no gate to
 * report on, and the old query never listed one.
 */
export function eligibleTracks(counts: TrackCounts[]): TrackCounts[] {
  return counts.filter((t) => t.flashcards.total > 0 || t.memorization.total > 0);
}

/**
 * The most recent of a set of timestamps, as ISO text.
 *
 * The roster used to `.sort()` Date objects with no comparator, which sorts
 * their toString() — "Wed Oct 14 ..." after "Thu Oct 15 ..." — so the
 * reported last activity was whichever weekday name sorted last.
 */
export function latestActivity(stamps: (Date | null)[]): string | null {
  let latest: Date | null = null;
  for (const stamp of stamps) {
    if (stamp && (!latest || stamp.getTime() > latest.getTime())) latest = stamp;
  }
  return latest ? latest.toISOString() : null;
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `pnpm vitest run src/lib/helper/track-counts.test.ts` → PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/helper/track-counts.ts src/lib/helper/track-counts.test.ts src/lib/types/common.ts
git commit -m "feat: add pure helpers that turn mastery rows into per-track counts"
```

---

### Task 8: Mastery views and the mastery data module

**Files:**
- Create: `prisma/migrations/20261014000100_mastery_views/migration.sql`, `src/server/data/mastery.ts`
- Test: `src/server/data/mastery.db.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 5); `ContentTotalsRow`, `ProgressRow`, `TrackCounts`, `buildTrackCounts`, `tracksWithContent` (Task 7).
- Produces (exact):

```ts
export async function getContentTotals(): Promise<ContentTotalsRow[]>;
export async function getTrackCounts(userId: string): Promise<TrackCounts[]>;            // tracks with content, standard order
export async function getTrackCount(userId: string, examType: ExamType): Promise<TrackCounts>; // zero-filled
export async function getTrackCountsFor(userIds: string[], tracks: readonly ExamType[]): Promise<Map<string, TrackCounts[]>>; // every user present, one entry per requested track
```

- [ ] **Step 1: Write the migration (hand-written, additive)**

```sql
-- prisma/migrations/20261014000100_mastery_views/migration.sql
-- Mastery counts, held once. Read-only views over existing tables: creating
-- them changes no table and no row. Rollback:
--   DROP VIEW user_track_progress; DROP VIEW track_content_totals;

CREATE VIEW track_content_totals AS
SELECT exam_type,
       count(*) FILTER (WHERE kind = 'f')::int AS flashcards,
       count(*) FILTER (WHERE kind = 'm')::int AS memorization,
       count(*) FILTER (WHERE kind = 'q')::int AS questions
  FROM (
        SELECT exam_type, 'f' AS kind FROM flashcards
        UNION ALL
        SELECT exam_type, 'm' FROM memorization
        UNION ALL
        SELECT exam_type, 'q' FROM questions
       ) content
 GROUP BY exam_type;

CREATE VIEW user_track_progress AS
SELECT user_id,
       exam_type,
       count(*) FILTER (WHERE kind = 'f' AND mastered)::int   AS flashcards_mastered,
       count(*) FILTER (WHERE kind = 'm' AND mastered)::int   AS memorization_mastered,
       count(*) FILTER (WHERE kind = 'm')::int                AS memorization_answered,
       count(*) FILTER (WHERE kind = 'm' AND is_correct)::int AS memorization_correct,
       count(*) FILTER (WHERE kind = 'q' AND mastered)::int   AS questions_mastered,
       count(*) FILTER (WHERE kind = 'a')::int                AS attempts_taken,
       count(*) FILTER (WHERE kind = 'a' AND passed)::int     AS passing_attempts,
       max(stamp) FILTER (WHERE kind IN ('f', 'm', 'q'))      AS last_reviewed_at,
       max(stamp) FILTER (WHERE kind = 's')                   AS last_answer_at
  FROM (
        SELECT fp.user_id, f.exam_type, 'f' AS kind, fp.mastered,
               NULL::boolean AS is_correct, NULL::boolean AS passed, fp.reviewed_at AS stamp
          FROM flashcard_progress fp JOIN flashcards f ON f.id = fp.flashcard_id
        UNION ALL
        SELECT mp.user_id, m.exam_type, 'm', mp.mastered, mp.is_correct, NULL, mp.reviewed_at
          FROM memorization_progress mp JOIN memorization m ON m.id = mp.memorization_id
        UNION ALL
        SELECT qp.user_id, q.exam_type, 'q', qp.mastered, NULL, NULL, qp.last_reviewed_at
          FROM question_progress qp JOIN questions q ON q.id = qp.question_id
        UNION ALL
        SELECT user_id, exam_type, 'a', NULL, NULL, passed, NULL
          FROM exam_attempts WHERE completed_at IS NOT NULL
        UNION ALL
        SELECT user_id, exam_type, 's', NULL, NULL, NULL, last_answer_at
          FROM study_streaks
       ) activity
 GROUP BY user_id, exam_type;
```

Apply it to the **local dev copy** only: `pnpm exec prisma migrate deploy` → `1 migration applied` (`MIGRATE_DATABASE_URL` is the local dev copy; the guard enforces it). The test database picks it up on the next `pnpm test:db` reset.

- [ ] **Step 2: Write the failing DB test**

```ts
// src/server/data/mastery.db.test.ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "@/server/db/prisma";
import { createUser, deleteUsers } from "@/test/db-fixtures";
import {
  getContentTotals,
  getTrackCount,
  getTrackCounts,
  getTrackCountsFor,
} from "./mastery";

let learner: string;
let untouched: string;
const contentIds: { f: string[]; m: string[]; q: string[] } = { f: [], m: [], q: [] };

beforeAll(async () => {
  learner = (await createUser()).id;
  untouched = (await createUser()).id;

  for (let i = 0; i < 2; i++) {
    const f = await prisma.flashcard.create({ data: { examType: "VUL", category: "t", front: `f${i}`, back: "b" } });
    contentIds.f.push(f.id);
  }
  const m = await prisma.memorization.create({ data: { examType: "VUL", category: "t", text: "m" } });
  contentIds.m.push(m.id);
  const q = await prisma.question.create({ data: { examType: "TRADITIONAL_LIFE", category: "t", text: "q" } });
  contentIds.q.push(q.id);

  await prisma.flashcardProgress.create({ data: { userId: learner, flashcardId: contentIds.f[0], mastered: true } });
  await prisma.flashcardProgress.create({ data: { userId: learner, flashcardId: contentIds.f[1], mastered: false } });
  await prisma.memorizationProgress.create({ data: { userId: learner, memorizationId: m.id, mastered: true, isCorrect: true } });
  await prisma.examAttempt.create({
    data: { userId: learner, examType: "VUL", type: "PRACTICE", score: 9, totalItems: 10, passed: true, completedAt: new Date() },
  });
  // An unfinished sitting counts for nothing.
  await prisma.examAttempt.create({
    data: { userId: learner, examType: "VUL", type: "PRACTICE", score: 0, totalItems: 10, passed: false },
  });
  await prisma.studyStreak.create({
    data: { userId: learner, examType: "VUL", lastAnswerAt: new Date("2026-10-14T09:00:00Z") },
  });
});

afterAll(async () => {
  await deleteUsers(learner, untouched);
  await prisma.flashcard.deleteMany({ where: { id: { in: contentIds.f } } });
  await prisma.memorization.deleteMany({ where: { id: { in: contentIds.m } } });
  await prisma.question.deleteMany({ where: { id: { in: contentIds.q } } });
});

describe("mastery data", () => {
  it("counts each track's content", async () => {
    const totals = await getContentTotals();
    expect(totals.find((t) => t.exam_type === "VUL")).toMatchObject({ flashcards: 2, memorization: 1, questions: 0 });
    expect(totals.find((t) => t.exam_type === "TRADITIONAL_LIFE")).toMatchObject({ questions: 1 });
  });

  it("reports a learner's standing on every track with content", async () => {
    const tracks = await getTrackCounts(learner);
    expect(tracks.map((t) => t.examType)).toEqual(["VUL", "TRADITIONAL_LIFE"]);
    const vul = tracks[0];
    expect(vul.flashcards).toEqual({ mastered: 1, total: 2 });
    expect(vul.memorization).toEqual({ mastered: 1, total: 1 });
    expect(vul.memorizationCorrect).toBe(1);
    expect(vul.attemptsTaken).toBe(1);
    expect(vul.passingAttempts).toBe(1);
    expect(vul.lastAnswerAt?.toISOString()).toBe("2026-10-14T09:00:00.000Z");
    expect(vul.lastReviewedAt).toBeInstanceOf(Date);
  });

  it("scores an untouched user as nought against real totals", async () => {
    const vul = await getTrackCount(untouched, "VUL");
    expect(vul.flashcards).toEqual({ mastered: 0, total: 2 });
    expect(vul.passingAttempts).toBe(0);
  });

  it("answers for every requested user and track, in one call", async () => {
    const byUser = await getTrackCountsFor([learner, untouched], ["VUL", "IIAP_A"]);
    expect([...byUser.keys()].sort()).toEqual([learner, untouched].sort());
    expect(byUser.get(untouched)!.map((t) => t.examType)).toEqual(["VUL", "IIAP_A"]);
    expect(byUser.get(learner)![0].flashcards.mastered).toBe(1);
    expect(byUser.get(learner)![1].flashcards).toEqual({ mastered: 0, total: 0 });
  });

  it("answers an empty map for no users without querying", async () => {
    expect((await getTrackCountsFor([], ["VUL"])).size).toBe(0);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `pnpm test:db` → FAIL, unresolved `./mastery`.

- [ ] **Step 4: Implement**

```ts
// src/server/data/mastery.ts
import "server-only";
import prisma from "@/server/db/prisma";
import {
  buildTrackCounts,
  tracksWithContent,
  type ContentTotalsRow,
  type ProgressRow,
  type TrackCounts,
} from "@/lib/helper/track-counts";
import type { ExamType } from "@/lib/types/common";

/**
 * The only reader of the mastery views (track_content_totals,
 * user_track_progress). The dashboard, the eligibility gate and the staff
 * roster all count through here, so they cannot disagree. Scoring stays in
 * the pure helpers (readiness, eligibility, practice-exam).
 *
 * The views are read with $queryRaw rather than Prisma `view` models, which
 * are still a preview feature; this file is the one place raw SQL remains.
 */

export async function getContentTotals(): Promise<ContentTotalsRow[]> {
  return prisma.$queryRaw<ContentTotalsRow[]>`
    SELECT exam_type::text AS exam_type, flashcards, memorization, questions
      FROM track_content_totals`;
}

async function getProgressRows(userIds: string[]): Promise<ProgressRow[]> {
  return prisma.$queryRaw<ProgressRow[]>`
    SELECT user_id::text AS user_id, exam_type::text AS exam_type,
           flashcards_mastered, memorization_mastered, memorization_answered,
           memorization_correct, questions_mastered, attempts_taken,
           passing_attempts, last_reviewed_at, last_answer_at
      FROM user_track_progress
     WHERE user_id = ANY(${userIds}::uuid[])`;
}

const byTrack = <T extends { exam_type: string }>(rows: T[]) =>
  new Map(rows.map((row) => [row.exam_type, row]));

/** One user, every track that holds content, in the standard order. */
export async function getTrackCounts(userId: string): Promise<TrackCounts[]> {
  const [totals, progress] = await Promise.all([
    getContentTotals(),
    getProgressRows([userId]),
  ]);
  const totalsBy = byTrack(totals);
  const progressBy = byTrack(progress);
  return tracksWithContent(totals).map((track) =>
    buildTrackCounts(track, totalsBy.get(track), progressBy.get(track)),
  );
}

/** One user, one named track; nought of nought when the track is empty. */
export async function getTrackCount(
  userId: string,
  examType: ExamType,
): Promise<TrackCounts> {
  const [totals, progress] = await Promise.all([
    getContentTotals(),
    getProgressRows([userId]),
  ]);
  return buildTrackCounts(
    examType,
    byTrack(totals).get(examType),
    byTrack(progress).get(examType),
  );
}

/**
 * Many users, the given tracks, two queries. Every user gets one entry per
 * requested track, zero-filled, so the roster never has to ask what is
 * missing.
 */
export async function getTrackCountsFor(
  userIds: string[],
  tracks: readonly ExamType[],
): Promise<Map<string, TrackCounts[]>> {
  const result = new Map<string, TrackCounts[]>();
  if (userIds.length === 0) return result;

  const [totals, progress] = await Promise.all([
    getContentTotals(),
    getProgressRows(userIds),
  ]);
  const totalsBy = byTrack(totals);
  const progressBy = new Map(
    progress.map((row) => [`${row.user_id} ${row.exam_type}`, row]),
  );

  for (const userId of userIds) {
    result.set(
      userId,
      tracks.map((track) =>
        buildTrackCounts(
          track,
          totalsBy.get(track),
          progressBy.get(`${userId} ${track}`),
        ),
      ),
    );
  }
  return result;
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `pnpm test:db` → PASS (all db tests, including Tasks 5–6).

- [ ] **Step 6: Commit**

```bash
git add prisma/migrations/20261014000100_mastery_views src/server/data/mastery.ts src/server/data/mastery.db.test.ts
git commit -m "feat: hold mastery counts once in two views read by one module"
```

---

### Task 9: Rewire eligibility (`_lib/mastery`, attempts, flashcards, memorization)

**Files:**
- Modify: `src/app/api/_lib/mastery.ts` (whole file), `src/app/api/attempts/eligibility/route.ts`, `src/app/api/attempts/route.ts:22-35`, `src/app/api/flashcards/eligibility/route.ts`, `src/app/api/memorization/eligibility/route.ts`
- Test: `src/app/api/attempts/eligibility/route.test.ts`, `src/app/api/flashcards/eligibility/route.test.ts`

**Interfaces:**
- Consumes: `getTrackCounts`, `getTrackCount` (Task 8); `eligibleTracks` (Task 7); `isExamType` (Task 7); `deriveEligibility` (existing).
- Produces: `fetchAllEligibility(userId: string): Promise<Record<string, Eligibility>>` (unchanged signature), `fetchEligibility(userId: string, examType: ExamType): Promise<Eligibility>` (now typed). Plan 2 changes `fetchAllEligibility`.

- [ ] **Step 1: Write the failing route tests**

```ts
// src/app/api/attempts/eligibility/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getTrackCounts, getTrackCount } = vi.hoisted(() => ({
  auth: vi.fn(),
  getTrackCounts: vi.fn(),
  getTrackCount: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/mastery", () => ({ getTrackCounts, getTrackCount }));

import { buildTrackCounts } from "@/lib/helper/track-counts";
import { GET } from "./route";

const get = (query = "") =>
  GET(new Request(`http://internal.local/api/attempts/eligibility${query}`));

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
});

describe("GET /api/attempts/eligibility", () => {
  it("refuses a caller who is not signed in", async () => {
    auth.mockResolvedValue(null);
    expect((await get()).status).toBe(401);
  });

  it("answers 400, not 500, for a track that does not exist", async () => {
    const response = await get("?exam_type=FOO");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "exam_type is invalid" });
    expect(getTrackCount).not.toHaveBeenCalled();
  });

  it("keys every track with decks by exam_type, skipping question-only tracks", async () => {
    getTrackCounts.mockResolvedValue([
      buildTrackCounts("VUL", { exam_type: "VUL", flashcards: 1, memorization: 1, questions: 0 }, undefined),
      buildTrackCounts("IIAP_B", { exam_type: "IIAP_B", flashcards: 0, memorization: 0, questions: 4 }, undefined),
    ]);
    const body = await (await get()).json();
    expect(Object.keys(body)).toEqual(["VUL"]);
    expect(body.VUL).toEqual({
      eligible: false,
      flashcards: { mastered: 0, total: 1 },
      memorization: { mastered: 0, total: 1 },
    });
  });
});
```

```ts
// src/app/api/flashcards/eligibility/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getTrackCount } = vi.hoisted(() => ({
  auth: vi.fn(),
  getTrackCount: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/mastery", () => ({ getTrackCount }));

import { buildTrackCounts } from "@/lib/helper/track-counts";
import { GET } from "./route";

const get = (query: string) =>
  GET(new Request(`http://internal.local/api/flashcards/eligibility${query}`));

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
});

describe("GET /api/flashcards/eligibility", () => {
  it("still requires exam_type", async () => {
    expect((await get("")).status).toBe(400);
  });

  it("answers 400 for an unknown track", async () => {
    expect((await get("?exam_type=FOO")).status).toBe(400);
  });

  it("keeps its own response shape", async () => {
    getTrackCount.mockResolvedValue(
      buildTrackCounts(
        "VUL",
        { exam_type: "VUL", flashcards: 2, memorization: 0, questions: 0 },
        {
          user_id: "u1", exam_type: "VUL", flashcards_mastered: 2, memorization_mastered: 0,
          memorization_answered: 0, memorization_correct: 0, questions_mastered: 0,
          attempts_taken: 0, passing_attempts: 0, last_reviewed_at: null, last_answer_at: null,
        },
      ),
    );
    expect(await (await get("?exam_type=VUL")).json()).toEqual({
      eligible: true, total: 2, mastered: 2,
    });
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run --project unit src/app/api/attempts/eligibility src/app/api/flashcards/eligibility`
Expected: FAIL. The routes still import `@/lib/db`, so `?exam_type=FOO` reaches the pool, and the mocked mastery module is never called.

- [ ] **Step 3: Rewrite `_lib/mastery.ts`**

```ts
// src/app/api/_lib/mastery.ts
import { deriveEligibility } from "@/lib/helper/eligibility";
import { eligibleTracks } from "@/lib/helper/track-counts";
import type { ExamType } from "@/lib/types/common";
import type { Eligibility } from "@/lib/types/eligibility";
import { getTrackCount, getTrackCounts } from "@/server/data/mastery";

/**
 * Practice-exam eligibility for every track with decks, keyed by exam_type.
 * The counts come from the mastery views, the same ones the dashboard and the
 * roster read.
 */
export async function fetchAllEligibility(
  userId: string,
): Promise<Record<string, Eligibility>> {
  const tracks = eligibleTracks(await getTrackCounts(userId));
  return Object.fromEntries(
    tracks.map((t) => [t.examType, deriveEligibility(t.flashcards, t.memorization)]),
  );
}

/** The same for one named track, for the gate on starting an attempt. */
export async function fetchEligibility(
  userId: string,
  examType: ExamType,
): Promise<Eligibility> {
  const t = await getTrackCount(userId, examType);
  return deriveEligibility(t.flashcards, t.memorization);
}
```

- [ ] **Step 4: Validate the track in the routes**

`src/app/api/attempts/eligibility/route.ts`: add `import { isExamType } from "@/lib/types/common";`. After `const examType = searchParams.get("exam_type");` the body becomes:

```ts
  if (examType !== null && !isExamType(examType)) {
    return NextResponse.json({ error: "exam_type is invalid" }, { status: 400 });
  }

  try {
    // No track named means every track, keyed by exam_type. The dashboard shows
    // all four at once and was asking four times over, eight counting queries
    // deep, for one screen.
    if (!examType) {
      return NextResponse.json(await fetchAllEligibility(session.user.id));
    }

    return NextResponse.json(await fetchEligibility(session.user.id, examType));
  } catch (error) {
```

(The rest is unchanged.)

`src/app/api/attempts/route.ts`: add `import { isExamType } from "@/lib/types/common";` and replace the `if (!exam_type)` block:

```ts
    if (!exam_type) {
      return NextResponse.json(
        { error: "exam_type is required" },
        { status: 400 },
      );
    }
    if (!isExamType(exam_type)) {
      return NextResponse.json(
        { error: "exam_type is invalid" },
        { status: 400 },
      );
    }
```

`src/app/api/flashcards/eligibility/route.ts`, the whole file:

```ts
import { auth } from "@/lib/auth";
import { isExamType } from "@/lib/types/common";
import { getTrackCount } from "@/server/data/mastery";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const examType = new URL(req.url).searchParams.get("exam_type");

  if (!examType) {
    return NextResponse.json(
      { error: "exam_type is required" },
      { status: 400 },
    );
  }
  if (!isExamType(examType)) {
    return NextResponse.json({ error: "exam_type is invalid" }, { status: 400 });
  }

  try {
    const { total, mastered } = (await getTrackCount(session.user.id, examType))
      .flashcards;
    return NextResponse.json({
      eligible: total > 0 && total === mastered,
      total,
      mastered,
    });
  } catch (error) {
    console.error("Error checking flashcard eligibility:", error);
    return NextResponse.json(
      { error: "Failed to check eligibility" },
      { status: 500 },
    );
  }
}
```

`src/app/api/memorization/eligibility/route.ts`: the same file with `.memorization` in place of `.flashcards` and `"Error checking memorization eligibility:"` as the log message.

- [ ] **Step 5: Run the tests**

Run: `pnpm test` → PASS, including the two new files. Run: `pnpm typecheck` → no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/_lib/mastery.ts src/app/api/attempts src/app/api/flashcards/eligibility src/app/api/memorization/eligibility
git commit -m "refactor: read practice-exam eligibility from the mastery module"
```

---

### Task 10: Rewire the dashboard summary (`api/progress`)

**Files:**
- Modify: `src/app/api/progress/route.ts` (whole file)
- Test: `src/app/api/progress/route.test.ts`

**Interfaces:**
- Consumes: `getTrackCounts` (Task 8); `cappedPasses`, `PASSES_REQUIRED` (existing).
- Produces: the same response array as before: `{ exam_type, last_activity_at, flashcard_pct, memorize_pct, practice_exam_pct, overall_pct, exam_passes, passes_required }[]`. Plan 2 filters it.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/progress/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getTrackCounts } = vi.hoisted(() => ({
  auth: vi.fn(),
  getTrackCounts: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/mastery", () => ({ getTrackCounts }));

import { buildTrackCounts } from "@/lib/helper/track-counts";
import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
});

describe("GET /api/progress", () => {
  it("refuses a caller who is not signed in", async () => {
    auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it("keeps the old arithmetic and response shape exactly", async () => {
    // 1/3, 2/3, 0/0 → 33.33 + 66.67 + 0, averaged unrounded → 33.
    getTrackCounts.mockResolvedValue([
      buildTrackCounts(
        "VUL",
        { exam_type: "VUL", flashcards: 3, memorization: 3, questions: 0 },
        {
          user_id: "u1", exam_type: "VUL", flashcards_mastered: 1, memorization_mastered: 2,
          memorization_answered: 2, memorization_correct: 2, questions_mastered: 0,
          attempts_taken: 7, passing_attempts: 7,
          last_reviewed_at: new Date("2026-10-14T09:00:00Z"), last_answer_at: null,
        },
      ),
    ]);
    expect(await (await GET()).json()).toEqual([
      {
        exam_type: "VUL",
        last_activity_at: "2026-10-14T09:00:00.000Z",
        flashcard_pct: 33,
        memorize_pct: 67,
        practice_exam_pct: 0,
        overall_pct: 33,
        exam_passes: 5,
        passes_required: 5,
      },
    ]);
  });

  it("reports no activity as null", async () => {
    getTrackCounts.mockResolvedValue([
      buildTrackCounts("IIAP_A", { exam_type: "IIAP_A", flashcards: 1, memorization: 0, questions: 0 }, undefined),
    ]);
    const [row] = await (await GET()).json();
    expect(row.last_activity_at).toBeNull();
    expect(row.overall_pct).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run --project unit src/app/api/progress`
Expected: FAIL. The route imports `@/lib/db` and never calls `getTrackCounts`.

- [ ] **Step 3: Rewrite the route**

```ts
// src/app/api/progress/route.ts
import { auth } from "@/lib/auth";
import type { MasteryCounts } from "@/lib/helper/readiness";
import { PASSES_REQUIRED, cappedPasses } from "@/lib/helper/practice-exam";
import { getTrackCounts } from "@/server/data/mastery";
import { NextResponse } from "next/server";

/** Unrounded share mastered; the overall figure averages these before rounding. */
const share = ({ mastered, total }: MasteryCounts) =>
  total > 0 ? (mastered / total) * 100 : 0;

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tracks = await getTrackCounts(session.user.id);

    const summary = tracks.map((t) => {
      const flashcardPct = share(t.flashcards);
      const memorizePct = share(t.memorization);
      const practicePct = share(t.practice);

      return {
        exam_type: t.examType,
        last_activity_at: t.lastReviewedAt ? t.lastReviewedAt.toISOString() : null,
        flashcard_pct: Math.round(flashcardPct),
        memorize_pct: Math.round(memorizePct),
        practice_exam_pct: Math.round(practicePct),
        overall_pct: Math.round((flashcardPct + memorizePct + practicePct) / 3),
        // Passing sittings: what the x / 5 counter reads, and the only thing
        // that decides whether a track is passed.
        exam_passes: cappedPasses(t.passingAttempts),
        passes_required: PASSES_REQUIRED,
      };
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching progress summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress summary" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `pnpm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/progress
git commit -m "refactor: build the dashboard summary from the mastery module"
```

---

### Task 11: Rewire the roster counts and fix `lastActivity`

**Files:**
- Modify: `src/app/api/admin/reviewees/route.ts:1-28` (imports and helpers), `:93-210` (the six count queries and `perTrack`), `:231-237` (`lastActivity`)
- Test: `src/app/api/admin/reviewees/route.test.ts`

**Interfaces:**
- Consumes: `getTrackCountsFor` (Task 8); `latestActivity` (Task 7); `trackReadiness`, `readinessStatus`, `masteryPercent`, `cappedPasses`, `hasPassedTrack`, `PASSES_REQUIRED` (existing). The reviewee list still comes from `pool` (moves in Wave 4).
- Produces: an unchanged response, except `activity.lastActivity` is now the latest instant. Plan 2 changes which tracks each row scores.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/admin/reviewees/route.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, query, getTrackCountsFor, touchLastSeen } = vi.hoisted(() => ({
  auth: vi.fn(),
  query: vi.fn(),
  getTrackCountsFor: vi.fn(),
  touchLastSeen: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/db", () => ({ default: { query } }));
vi.mock("@/server/data/mastery", () => ({ getTrackCountsFor }));
vi.mock("@/app/api/_lib/presence-store", () => ({ touchLastSeen }));

import { buildTrackCounts, type ProgressRow } from "@/lib/helper/track-counts";
import { examTypes } from "@/lib/types/common";
import { GET } from "./route";

const reviewee = {
  id: "r1", email: "r@example.test", name: "Rae", role: "USER", image: null,
  manager_id: null, manager_name: null, manager_email: null, manager_role: null, manager_image: null,
};

const progress = (exam_type: string, last_answer_at: Date | null): ProgressRow => ({
  user_id: "r1", exam_type, flashcards_mastered: 1, memorization_mastered: 1,
  memorization_answered: 2, memorization_correct: 1, questions_mastered: 0,
  attempts_taken: 1, passing_attempts: 1, last_reviewed_at: null, last_answer_at,
});

const totals = (exam_type: string) => ({ exam_type, flashcards: 1, memorization: 1, questions: 1 });

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "admin", role: "ADMIN" } });
  query.mockResolvedValue({ rows: [reviewee] });
});

describe("GET /api/admin/reviewees", () => {
  it("scores each track from the mastery module", async () => {
    getTrackCountsFor.mockImplementation(async (ids: string[], tracks: string[]) =>
      new Map([[ids[0], tracks.map((t) => buildTrackCounts(t as never, totals(t), progress(t, null)))]]),
    );
    const [row] = await (await GET(new Request("http://internal.local/api/admin/reviewees"))).json();

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
    const [row] = await (await GET(new Request("http://internal.local/api/admin/reviewees"))).json();
    expect(row.activity.lastActivity).toBe(thursday.toISOString());
  });

  it("narrows to one track with ?exam_type", async () => {
    getTrackCountsFor.mockResolvedValue(new Map([["r1", []]]));
    await GET(new Request("http://internal.local/api/admin/reviewees?exam_type=IIAP_A"));
    expect(getTrackCountsFor).toHaveBeenCalledWith(["r1"], ["IIAP_A"]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm vitest run --project unit src/app/api/admin/reviewees/route.test.ts`
Expected: FAIL. The route runs its own six queries through the mocked `query` and never calls `getTrackCountsFor`.

- [ ] **Step 3: Edit the route**

Imports: remove nothing that is still used. Add:

```ts
import { latestActivity } from "@/lib/helper/track-counts";
import { getTrackCountsFor } from "@/server/data/mastery";
```

Delete the now-unused helpers `TrackRow`, `trackKey`, `indexByTrack` and the `Counts` type (lines 17–28). Keep `pct`.

Replace everything from the comment `// Progress tables reference content by id...` through the end of the `perTrack` map (old lines 93–210) with:

```ts
    // Counts per reviewee and track come from the mastery views, the same
    // ones the dashboard reads, so the two can no longer disagree.
    const countsByUser = await getTrackCountsFor(userIds, tracks);

    const roster = users.map((user) => {
      const perTrack = (countsByUser.get(user.id) ?? []).map((t) => ({
        track: t.examType,
        readiness: trackReadiness({
          flashcards: t.flashcards,
          memorization: t.memorization,
          practice: t.practice,
        }),
        flashcards: t.flashcards,
        memorization: t.memorization,
        practice: t.practice,
        answered: t.memorizationAnswered,
        correct: t.memorizationCorrect,
        taken: t.attemptsTaken,
        passes: cappedPasses(t.passingAttempts),
        // study_streaks is the one table that records when a learner last
        // answered anything on a track.
        lastActivity: t.lastAnswerAt,
      }));
```

Replace the `lastActivity` computation (old lines 232–237) with:

```ts
      const lastActivity = latestActivity(perTrack.map((row) => row.lastActivity));
```

Everything after it (`return { id: user.id, ... }`) is unchanged.

- [ ] **Step 4: Run it to see it pass**

Run: `pnpm test` → PASS. Run: `pnpm typecheck` → no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/reviewees/route.ts src/app/api/admin/reviewees/route.test.ts
git commit -m "refactor: score the roster from the mastery module

Also fixes the reported last activity, which sorted Date objects as text
and so picked the alphabetically last weekday rather than the latest day."
```

---

### Task 12: Parity check against the old SQL, then final verification

**Files:**
- Create: `scripts/parity/mastery-parity.ts`

**Interfaces:**
- Consumes: `getTrackCounts`, `getTrackCountsFor` (Task 8); `eligibleTracks` (Task 7); the local dev copy via `MIGRATE_DATABASE_URL`.

- [ ] **Step 1: Write the script**

The old queries are copied **verbatim** from the pre-Wave-0 code (`git show 5a16508:src/app/api/progress/route.ts` etc.), so the script stays a fixed reference after the routes change.

```ts
// scripts/parity/mastery-parity.ts
// Compares the pre-Prisma mastery SQL with src/server/data/mastery.ts on the
// local dev copy. Exit code 1 on any difference. Run: pnpm parity
import { config } from "dotenv";
import { Pool } from "pg";
import { assertLocalDatabase } from "../../src/server/db/local-guard";
import { examTypes } from "../../src/lib/types/common";

config({ path: ".env.local" });
const url = assertLocalDatabase(process.env.MIGRATE_DATABASE_URL);
process.env.DATABASE_URL = url;

const pool = new Pool({ connectionString: url });
const diffs: string[] = [];
const same = (label: string, a: unknown, b: unknown) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    diffs.push(`${label}\n  old: ${JSON.stringify(a)}\n  new: ${JSON.stringify(b)}`);
  }
};

// From api/progress (verbatim CTE, minus the activity/pass sub-queries'
// formatting): per-track totals and mastered counts for one user.
const OLD_PROGRESS = `
  WITH flashcard_stats AS (
    SELECT f.exam_type, COUNT(f.id) AS total,
           COUNT(fp.id) FILTER (WHERE fp.mastered = true) AS mastered
    FROM flashcards f
    LEFT JOIN flashcard_progress fp ON fp.flashcard_id = f.id AND fp.user_id = $1
    GROUP BY f.exam_type),
  memorization_stats AS (
    SELECT m.exam_type, COUNT(m.id) AS total,
           COUNT(mp.id) FILTER (WHERE mp.mastered = true) AS mastered
    FROM memorization m
    LEFT JOIN memorization_progress mp ON mp.memorization_id = m.id AND mp.user_id = $1
    GROUP BY m.exam_type),
  question_stats AS (
    SELECT q.exam_type, COUNT(q.id) AS total,
           COUNT(qp.id) FILTER (WHERE qp.mastered = true) AS mastered
    FROM questions q
    LEFT JOIN question_progress qp ON qp.question_id = q.id AND qp.user_id = $1
    GROUP BY q.exam_type),
  exam_pass_stats AS (
    SELECT exam_type, COUNT(*) AS passes FROM exam_attempts
    WHERE user_id = $1 AND passed = true AND completed_at IS NOT NULL
    GROUP BY exam_type),
  activity_stats AS (
    SELECT exam_type, MAX(reviewed_at) AS last_activity_at FROM (
      SELECT f.exam_type, fp.reviewed_at FROM flashcard_progress fp
        JOIN flashcards f ON f.id = fp.flashcard_id WHERE fp.user_id = $1
      UNION ALL
      SELECT m.exam_type, mp.reviewed_at FROM memorization_progress mp
        JOIN memorization m ON m.id = mp.memorization_id WHERE mp.user_id = $1
      UNION ALL
      SELECT q.exam_type, qp.last_reviewed_at FROM question_progress qp
        JOIN questions q ON q.id = qp.question_id WHERE qp.user_id = $1
    ) reviews GROUP BY exam_type)
  SELECT COALESCE(f.exam_type, m.exam_type, q.exam_type)::text AS exam_type,
         a.last_activity_at,
         COALESCE(f.total, 0)::int AS flashcard_total, COALESCE(f.mastered, 0)::int AS flashcard_mastered,
         COALESCE(m.total, 0)::int AS memorize_total, COALESCE(m.mastered, 0)::int AS memorize_mastered,
         COALESCE(q.total, 0)::int AS practice_total, COALESCE(q.mastered, 0)::int AS practice_mastered,
         COALESCE(p.passes, 0)::int AS exam_passes
  FROM flashcard_stats f
  FULL OUTER JOIN memorization_stats m ON m.exam_type = f.exam_type
  FULL OUTER JOIN question_stats q ON q.exam_type = COALESCE(f.exam_type, m.exam_type)
  LEFT JOIN activity_stats a ON a.exam_type = COALESCE(f.exam_type, m.exam_type, q.exam_type)
  LEFT JOIN exam_pass_stats p ON p.exam_type = COALESCE(f.exam_type, m.exam_type, q.exam_type)`;

// From admin/reviewees: per (user, track) counts for many users.
const OLD_ROSTER = {
  flashcards: `SELECT fp.user_id::text, f.exam_type::text, COUNT(*) FILTER (WHERE fp.mastered)::int AS mastered
                 FROM flashcard_progress fp JOIN flashcards f ON f.id = fp.flashcard_id
                WHERE fp.user_id = ANY($1) GROUP BY fp.user_id, f.exam_type`,
  memorization: `SELECT mp.user_id::text, m.exam_type::text,
                        COUNT(*) FILTER (WHERE mp.mastered)::int AS mastered,
                        COUNT(*)::int AS answered,
                        COUNT(*) FILTER (WHERE mp.is_correct)::int AS correct
                   FROM memorization_progress mp JOIN memorization m ON m.id = mp.memorization_id
                  WHERE mp.user_id = ANY($1) GROUP BY mp.user_id, m.exam_type`,
  questions: `SELECT qp.user_id::text, q.exam_type::text, COUNT(*) FILTER (WHERE qp.mastered)::int AS mastered
                FROM question_progress qp JOIN questions q ON q.id = qp.question_id
               WHERE qp.user_id = ANY($1) GROUP BY qp.user_id, q.exam_type`,
  attempts: `SELECT user_id::text, exam_type::text, COUNT(*)::int AS taken,
                    COUNT(*) FILTER (WHERE passed)::int AS passed
               FROM exam_attempts WHERE user_id = ANY($1) AND completed_at IS NOT NULL
              GROUP BY user_id, exam_type`,
  streaks: `SELECT user_id::text, exam_type::text, last_answer_at FROM study_streaks WHERE user_id = ANY($1)`,
};

async function main() {
  const { getTrackCounts, getTrackCountsFor } = await import("../../src/server/data/mastery");
  const { eligibleTracks } = await import("../../src/lib/helper/track-counts");

  const users = (await pool.query(`SELECT id::text FROM users`)).rows.map((r) => r.id as string);
  console.log(`Comparing ${users.length} users…`);

  for (const userId of users) {
    const old = (await pool.query(OLD_PROGRESS, [userId])).rows
      .filter((r) => (examTypes as readonly string[]).includes(r.exam_type))
      .sort((a, b) => examTypes.indexOf(a.exam_type) - examTypes.indexOf(b.exam_type));
    const next = await getTrackCounts(userId);

    same(`progress tracks ${userId}`, old.map((r) => r.exam_type), next.map((t) => t.examType));
    for (const t of next) {
      const r = old.find((o) => o.exam_type === t.examType);
      same(`progress ${userId} ${t.examType}`, {
        f: [r?.flashcard_mastered, r?.flashcard_total], m: [r?.memorize_mastered, r?.memorize_total],
        q: [r?.practice_mastered, r?.practice_total], passes: r?.exam_passes,
        last: r?.last_activity_at ? new Date(r.last_activity_at).toISOString() : null,
      }, {
        f: [t.flashcards.mastered, t.flashcards.total], m: [t.memorization.mastered, t.memorization.total],
        q: [t.practice.mastered, t.practice.total], passes: t.passingAttempts,
        last: t.lastReviewedAt ? t.lastReviewedAt.toISOString() : null,
      });
    }

    // Old eligibility listed tracks present in flashcards or memorization.
    const oldEligible = old.filter((r) => r.flashcard_total > 0 || r.memorize_total > 0).map((r) => r.exam_type);
    same(`eligibility tracks ${userId}`, oldEligible, eligibleTracks(next).map((t) => t.examType));
  }

  const rosterNew = await getTrackCountsFor(users, examTypes);
  const rosterOld = Object.fromEntries(
    await Promise.all(
      Object.entries(OLD_ROSTER).map(async ([k, sql]) => [k, (await pool.query(sql, [users])).rows]),
    ),
  ) as Record<keyof typeof OLD_ROSTER, Record<string, unknown>[]>;
  const pick = (rows: Record<string, unknown>[], u: string, t: string) =>
    rows.find((r) => r.user_id === u && r.exam_type === t);

  for (const userId of users) {
    for (const t of rosterNew.get(userId)!) {
      const m = pick(rosterOld.memorization, userId, t.examType);
      const a = pick(rosterOld.attempts, userId, t.examType);
      same(`roster ${userId} ${t.examType}`, {
        f: pick(rosterOld.flashcards, userId, t.examType)?.mastered ?? 0,
        m: m?.mastered ?? 0, answered: m?.answered ?? 0, correct: m?.correct ?? 0,
        q: pick(rosterOld.questions, userId, t.examType)?.mastered ?? 0,
        taken: a?.taken ?? 0, passed: a?.passed ?? 0,
        last: (pick(rosterOld.streaks, userId, t.examType)?.last_answer_at as Date | undefined)?.toISOString() ?? null,
      }, {
        f: t.flashcards.mastered, m: t.memorization.mastered, answered: t.memorizationAnswered,
        correct: t.memorizationCorrect, q: t.practice.mastered, taken: t.attemptsTaken,
        passed: t.passingAttempts, last: t.lastAnswerAt?.toISOString() ?? null,
      });
    }
  }

  console.log(diffs.length === 0 ? "parity: 0 differences" : diffs.join("\n"));
  if (diffs.length) process.exitCode = 1;
  console.log(
    "Intended differences, not compared: GET /api/user (deleted in Wave 1); roster activity.lastActivity (now the latest instant).",
  );
}

main().finally(() => pool.end());
```

- [ ] **Step 2: Run it**

Run: `pnpm parity`
Expected: `Comparing N users…` then `parity: 0 differences`. **Any difference stops the plan.** Report it to Nelson with the printed rows; don't edit the views to hide it.

If the local copy has little progress data, add some first with the existing scripts, pointed at the local copy: `DATABASE_URL="$MIGRATE_DATABASE_URL" node scripts/seed-vul-mastery.cjs <email>`, after confirming the script reads `DATABASE_URL` and that it's local. Then run `pnpm parity` again.

- [ ] **Step 3: Full verification**

Run each, and paste the output summary into the PR:
- `pnpm typecheck`: no errors
- `pnpm lint`: no new errors (warnings already present are fine)
- `pnpm test`: all unit tests pass
- `pnpm test:db`: all db tests pass
- `pnpm parity`: `0 differences`
- `pnpm build`: succeeds (proves `prisma generate` + Next build together)

Manual pass: `pnpm dev` (reads `.env.local` → local dev copy). Sign in as a seeded reviewee and confirm `/dashboard` shows the same per-track numbers as before Wave 0 (compare with `git stash` or a second checkout at `5a16508`). Sign in as an admin and confirm `/admin` loads with the same readiness figures. Use the built-in browser preview and take a screenshot of each for the PR.

- [ ] **Step 4: Commit and open the PR**

```bash
git add scripts/parity/mastery-parity.ts
git commit -m "test: compare the old mastery SQL with the new module"
git push -u origin nelson
gh pr create --base dev --title "Prisma Wave 0: foundation and one source for mastery" --body-file <scratchpad>/pr-body.md
```

PR body (written to the scratchpad file, no attribution line, per Nelson):

```md
Implements Wave 0 of docs/superpowers/specs/2026-10-14-prisma-migration-design.md.

- Prisma schema introspected from the existing database (names mapped, no table changes) and a baseline `0_init`, proven equal to the live schema with a pg_dump diff.
- Two additive views hold the mastery counts; `src/server/data/mastery.ts` is their only reader. Dashboard, eligibility and roster now count through it.
- Old migrations archived; glossary seed moved to `prisma db seed`.
- Prisma CLI, tests and the parity script refuse any non-local database.

Intended behaviour changes:
- Roster `lastActivity` is now the most recent instant (it sorted dates as text).
- Unknown `exam_type` on eligibility routes and POST /api/attempts returns 400 instead of 500.

Verification: typecheck, lint, unit tests, db tests, `pnpm parity` (0 differences), build, manual check of /dashboard and /admin.

**Production (Nelson, after merge):** backup; `ALLOW_REMOTE_MIGRATE=1 MIGRATE_DATABASE_URL=<railway> pnpm exec prisma migrate resolve --applied 0_init`; same env, `pnpm exec prisma migrate deploy` (creates the two views only); spot-check /dashboard and /admin. Rollback: `DROP VIEW user_track_progress; DROP VIEW track_content_totals;`.
```

Then bind the PR in the app (`ccd_pr` tools) and report the link.
