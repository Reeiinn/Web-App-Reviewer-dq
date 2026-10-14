# Prisma migration — design

**Date:** 2026-10-14
**Status:** approved; Waves 0–2 implemented (see Wave 0, 1 and 2 outcomes)
**Follow-up:** [Focus tracks (backend)](2026-10-14-focus-tracks-backend-design.md) builds on this.

## Ground rules (from Nelson)

These override anything else in this document.

1. **Existing data is never affected.** Every migration is additive: no
   rename, drop or type change on an existing table, column, enum value, index
   or trigger, and no statement that rewrites existing rows. The only new
   database objects in this spec are two read-only views.
2. **Nothing is pushed to the Railway database during development.** No
   `prisma db push`, `prisma migrate dev`, `migrate deploy` or
   `migrate resolve` against it, and no `scripts/migrate.cjs` run. All Prisma
   commands run against a local Postgres that Nelson sets up; its URL is asked
   for when first needed, not read from `.env`.
3. **Production is applied by Nelson, by hand,** from the checklist at the end
   of this document, after the PR is merged.
4. **Commits are authored by Nelson alone,** with no co-author trailer.
5. **Pull requests target `dev`,** never `main`. `main` is what production
   runs, and the client is already using it; work reaches `main` only when
   Nelson promotes `dev` himself. When opening a PR, check that its base
   branch reads `dev` before submitting.

## Problem

The data layer is raw `pg`. The pool in `src/lib/db.ts` is imported directly
by 42 files — every API route, the `_lib/*-store.ts` helpers, `src/lib/auth.ts`
and two certificate pages — so SQL lives inside route handlers and rows come
back untyped and are cast by hand.

The same mastery counts are written three times, in three shapes:

- `src/app/api/_lib/mastery.ts` (`fetchAllEligibility`, `fetchEligibility`)
- `src/app/api/progress/route.ts` (one CTE with five sub-queries)
- `src/app/api/admin/reviewees/route.ts` (six grouped queries, joined in TS)

Nothing forces them to agree, and the next feature (focus tracks) would have to
change all three.

Schema history is split between 24 hand-applied files in `src/migration/` and
the idempotent `scripts/migrate.cjs`, and the database records neither.

## Scope

In scope:

- Prisma schema introspected from the existing database, and one shared client.
- A recorded baseline so future schema changes go through `prisma migrate`.
- Two SQL views that hold the mastery counts once, read by one module.
- Moving every `pg` call into per-domain data modules backed by Prisma, in waves.
- Removing `src/lib/db.ts` once nothing imports it.

Out of scope:

- Any change to what an endpoint returns. Response shapes stay byte-for-byte
  compatible; the frontend is not touched. The exceptions are
  `GET /api/user`, which is deleted (see Wave 1); the roster's
  `activity.lastActivity`, which sorted `Date` objects as text and so
  reported the alphabetically last weekday, and now reports the latest
  instant; and an unknown `exam_type` on the eligibility routes and
  `POST /api/attempts`, which answers 400 instead of a 500. Wave 2 adds the
  four study lists to that 400 rule, deletes six study routes nothing
  called, and puts the glossary's `details` back (see Wave 2 outcome).
- Any change to how a user is removed (see Deleting a user).
- Renaming tables or columns, or any other schema cleanup.
- The focus-tracks feature (its own spec).

## Foundation

### Schema and client

- `prisma/schema.prisma` is generated with `prisma db pull` from the local copy
  of the database. Postgres enums `exam_type`, `user_role` and `attempt_type`
  become Prisma enums. Models and fields take readable names, mapped onto the
  existing tables and columns with `@@map` / `@map`, so the database itself
  does not change.
- `prisma.config.ts` at the repo root holds the schema path, migrations path and
  seed command.
- `src/server/db/prisma.ts` exports the one client, built on the `pg` driver
  adapter with the settings `db.ts` uses today: TLS without chain
  verification, `idleTimeoutMillis: 30_000`, `connectionTimeoutMillis: 10_000`.
  It is cached on `global` in every environment, as `db.ts` is, and imports
  `server-only`.
- **Connection budget.** While `db.ts` and Prisma coexist, `db.ts` is capped
  at `max: 3` and Prisma at `max: 2`, so one instance holds no more than
  today's 5. The split shifts towards Prisma as routes move, and once `db.ts`
  is gone Prisma's pool returns to 5.

### Baseline and migrations

- A `0_init` migration is generated from the introspected schema
  (`prisma migrate diff --from-empty --to-schema`). It describes what already
  exists and is never executed against a database that has the tables: on the
  local database and in production it is only marked applied.
- From then on, every schema change is a `prisma migrate` migration.
- `scripts/migrate.cjs` and `src/migration/*.sql` move to
  `src/migration/archive/`, unchanged, as history. The glossary upsert in
  `migrate.cjs` becomes the `prisma db seed` script, still keyed on
  `(exam_type, term)` so a reseed updates in place.
- The `set_updated_at` trigger stays the only thing that writes `updated_at`.
  The schema does not use `@updatedAt`, so the column is never written twice.

### One source for mastery

A migration (`<timestamp>_mastery_views`, hand-written) adds two views
(additive, read-only):

- `track_content_totals` — `exam_type`, `flashcards`, `memorization`,
  `questions`: how many items each track holds.
- `user_track_progress` — one row per `(user_id, exam_type)` with
  `flashcards_mastered`, `memorization_mastered`, `memorization_answered`,
  `memorization_correct`, `questions_mastered`, `passing_attempts`,
  `attempts_taken`, `last_reviewed_at` (latest review in any mode — the
  dashboard's notion of activity) and `last_answer_at` (from
  `study_streaks` — the roster's). Both are kept because the two screens
  have always meant different things by "last activity".

The counting SQL in those views is lifted from the three existing copies, so
the numbers do not move. The view SQL is hand-written in the migration,
since Prisma does not generate views. `mastery.ts` reads them with typed
`$queryRaw` rather than Prisma `view` models, which are still a preview
feature; that file stays the only raw SQL in the app.

`src/server/data/mastery.ts` is the only reader. It returns counts per track
for one user or many; the arithmetic stays in the pure functions that already
have tests — `trackReadiness` / `readinessStatus` / `masteryPercent` in
`readiness.ts`, `deriveEligibility` in `eligibility.ts`, `cappedPasses` /
`hasPassedTrack` in `practice-exam.ts`.

### Code layout

```
src/server/
  db/prisma.ts          the client
  data/
    mastery.ts          views above
    users.ts            accounts, avatar, tours, password reset, invites
    content.ts          flashcards, memorization, questions, glossary
    progress.ts         per-item progress, study sessions, streaks, recent activity
    attempts.ts         exam attempts and answers
    certificates.ts     issue and read certificates
    staff.ts            roster, managers, nudges, audit log, presence
```

Route handlers keep auth, input validation and response shaping, and call a
data module. No route, page or `_lib` file builds a query itself.
`src/app/api/_lib/*-store.ts` become thin re-exports during the move and are
deleted in the last wave.

Multi-statement writes (`auth/register`, `auth/reset-password`) use
`prisma.$transaction`, keeping today's all-or-nothing behaviour.

## Migration waves

Each wave is its own commit (or small run of commits), passes `pnpm typecheck`,
`pnpm lint` and `pnpm test`, and leaves the app working with `pg` and Prisma
side by side.

| Wave | Moves to Prisma |
| ---- | --------------- |
| 0. Foundation | schema, client, baseline, mastery views; `_lib/mastery.ts`, `api/progress`, `api/admin/reviewees` (counts only), `api/flashcards/eligibility`, `api/memorization/eligibility` |
| 1. Accounts | `lib/auth.ts`, `auth/register`, `auth/forgot-password`, `auth/reset-password`, `user/avatar`, `user/tour`, `api/invites`; delete `GET /api/user` |
| 2. Study | `api/flashcards/**`, `api/memorization/**`, `api/questions/**`, `api/glossary`, `study-session-store`, `streak-store`, `recent-activity-store` |
| 3. Exams | `api/attempts/**`, `_lib/certificates`, `certificates/[id]/image`, `app/certificates/page`, `app/certificates/[id]/page` |
| 4. Staff | rest of `admin/reviewees`, `admin/reviewees/[id]`, `admin/reviewees/[id]/nudge`, `admin/managers`, `api/nudges`, `audit-store`, `presence-store` |
| 5. Cleanup | delete `src/lib/db.ts` and the `_lib` stores; port `scripts/seed-*.cjs` to Prisma; restore Prisma's pool to 5; drop `dotenv` if nothing still needs it |

`pg` itself stays as a dependency: the driver adapter runs on it.

**`GET /api/user` is deleted in Wave 1, not ported.** It holds a fourth copy
of the mastery counts, and a wrong one: it groups on the progress table's
`user_id`, so a track's total counts only the items a reviewee has touched —
three flashcards seen of 200, all three mastered, reads 100%. Nothing in the
frontend calls it (the roster reads `admin/reviewees`). `/api/user/avatar` and
`/api/user/tour` are separate routes and are ported as normal.

## Deleting a user

Behaviour does not change. "Remove" on the console stays a soft delete — it
stamps `users.deleted_at`, every read filters on it, and the reviewee's work
survives and can be restored.

What a hard `DELETE FROM users` does today, and what the Prisma schema must
mirror exactly with `onDelete`:

- **Cascade** (removed with the user): `flashcard_progress`,
  `memorization_progress`, `question_progress`, `user_progress`,
  `exam_attempts` (and through them `exam_attempt_answers`), `certificates`,
  `study_sessions`, `study_streaks`, `recent_activity`, `nudges.user_id`,
  `password_reset_tokens`, `registration_invites.created_by`.
- **Set null** (kept, with copied names): `admin_actions.actor_id`,
  `admin_actions.target_id`, `nudges.sender_id`.
- **Known gap, left as is:** `users.manager_id` has no delete rule, so hard
  deleting a Field Manager who still has recruits fails on the foreign key.
  Nothing in the app hard-deletes, so this is recorded, not changed —
  changing it would alter an existing constraint (ground rule 1).

A test against the local database creates a user with a row in every
cascading table, deletes the user, and asserts that none of those rows remain
and that the set-null rows survive with their snapshots. Every table added
later that references `users` (starting with `user_focus_tracks`) uses
`ON DELETE CASCADE` and is added to that test.

## Testing

- **Parity before replacement.** Wave 0 adds a one-off script that runs the old
  SQL and the new `mastery.ts` against the same local database for every user
  and compares per-track numbers. Old code is deleted only when it reports
  zero differences. The same check is repeated for any wave whose endpoint
  returns computed numbers (roster, progress, certificates).
- **Existing tests keep passing.** The two tests that mock `@/lib/db`
  (`auth/forgot-password/route.test.ts`, `certificates/[id]/image/route.test.ts`)
  switch to mocking the data module they now call.
- **Data modules are tested against a local database,** not mocks, with
  vitest: a separate, local-only test database (`TEST_DATABASE_URL`) that
  each run rebuilds from `prisma/migrations`. The setup refuses any
  non-local host, and tests never read the production `DATABASE_URL`.
- **Migrations are checked mechanically.** A unit test reads every migration
  except `0_init` and fails on `DROP`, `RENAME`, `TRUNCATE`, row rewrites and
  column type or nullability changes. A reviewed exception must be marked
  `-- additive-check: allow` on its line.
- **The Prisma CLI reads only `MIGRATE_DATABASE_URL`,** and
  `prisma.config.ts` refuses a non-local host unless `ALLOW_REMOTE_MIGRATE=1`
  is set by hand — which happens only in the production checklist.
- Every wave: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and a manual pass of
  the screens that wave touches in `pnpm dev` against the local database.

## Production checklist (Nelson runs this, after merge)

1. Take a Railway backup.
2. Set `MIGRATE_DATABASE_URL=<Railway URL>` and `ALLOW_REMOTE_MIGRATE=1` in
   the shell for the commands below only.
3. **Check for drift (read-only):**
   `prisma migrate diff --from-config-datasource --to-migrations prisma/migrations --script`.
   It must print an empty migration (Prisma does not compare views, so the
   missing mastery views do not show). Anything else means production changed
   since the 2026-10-14 dump: stop.
4. `prisma migrate resolve --applied 0_init` — records the baseline; runs no
   SQL. Its only side effect is Prisma's `_prisma_migrations` bookkeeping
   table.
5. `prisma migrate status` — must list exactly one pending migration, the
   mastery views.
6. `prisma migrate deploy` — applies it; it only creates views.
7. Unset both variables. Spot-check `/dashboard` and `/admin` numbers
   against the backup's.

Rollback for step 6 is `DROP VIEW user_track_progress, track_content_totals;`,
which touches no table. If `deploy` is run before step 4 by mistake, `0_init`
fails on its first `CREATE TYPE` without touching data; recover with
`prisma migrate resolve --rolled-back 0_init` and continue from step 4.

## Wave 0 outcome (2026-10-14)

What implementing Wave 0 found, recorded so later waves start from it:

- **Prisma 7.10.0** throughout (CLI pinned; the registry default had
  resolved to an 8.0 release candidate). pnpm 11 must be allowed to run
  Prisma's and esbuild's install scripts (`pnpm-workspace.yaml`).
- **The real schema** has no `exam_attempts.type` column and no
  `attempt_type` enum; `choices` and `memorization_choices` require
  `sort_order`; `exam_attempt_answers` carries two identical unique
  constraints. `exam_type` still holds the legacy `IIAP` value.
- **`0_init`** needed hand fixes beyond generation (pgcrypto, the trigger,
  `NOT NULL` on `onboarding_tours_seen`, constraints rather than unique
  indexes). With them, a database built from the migrations dumps to the
  same schema as the production restore. `partialIndexes` models
  `users_active_idx` and Prisma ignores views, so diffs start empty.
- **Time zones.** `@prisma/adapter-pg` 7.10 drops the offset on every
  `timestamptz` it reads and sends instants without one, so on a non-UTC
  server every timestamp was off by that zone. Prisma's sessions are pinned
  to UTC (`-c TimeZone=UTC`). That also makes session-dependent SQL —
  `now()::date`, `date_trunc`, `to_char(now(), ...)` — evaluate in UTC: check
  this when certificate numbering (`to_char(now(), 'YYYY')`) and streak days
  move in Waves 2 and 3.
- **Connection budget** is 3 (`pg`) + 2 (Prisma) while both exist.
- **Parity:** all 56 users of the production restore, 0 differences.

## Wave 1 outcome (2026-10-14)

- **`src/server/data/users.ts`** holds every account query: sign-in, session
  claims, avatar, tours, reset tokens, invites and registration. Routes map
  its camelCase results back to the old snake_case JSON. Route tests pin
  register and invites byte for byte.
- **The signup link is tested end to end** against the local test database
  (`register/signup-link.db.test.ts`): the invites route makes the link, the
  `?code=` it carries is posted to register exactly as the signup page does,
  and the account that comes back passes the signup grant and password
  check that the automatic sign-in runs. The same link a second time is
  refused. The test passed on the old `pg` code before the switch and passes
  after it.
- **Transactions.** Registration claims the invite and inserts the user in
  one interactive transaction. A refusal throws inside it, so the claim is
  rolled back, and a duplicate email (Prisma `P2002`, confirmed against
  Postgres) releases the invite. Reset spends the token and sets the
  password together. Issuing a reset link and replacing an addressed
  invite are now atomic as well; before, they were two separate statements.
- **Clock.** Expiry checks that used Postgres's `now()` use the app's clock.
  With UTC sessions, the only difference is host clock skew.
- **Production needs nothing for this wave.** It adds no migration and
  changes no schema, so it ships as code only; the Wave 0 checklist above is
  still the only thing to run against Railway.
- **`GET /api/user`** is deleted. A stale `.next/dev/types` left by an
  earlier `pnpm dev` still referenced it and broke `tsc` until it was
  removed; `next dev` regenerates it.
- **Connection budget** is unchanged at 3 + 2. Session refresh (the `jwt`
  callback, on every `auth()` call) now reads through Prisma, but it is one
  primary-key lookup per request against several `pg` queries, so `pg` keeps
  the larger share. Wave 2 moves the study routes, the bulk of the traffic,
  and flips the split to 2 (`pg`) + 3 (Prisma) in the same change.
- **Interactive transactions** (register, reset) wait up to 10s for a
  connection and run for up to 10s, the `pg` pool's
  `connectionTimeoutMillis`. Prisma's default 2s wait turned a busy moment
  into a 500 on signup; a test holding both connections pins it.

## Wave 2 outcome (2026-10-14)

- **`src/server/data/content.ts`** reads flashcards, questions, memorization
  and the glossary, returning the API types in `src/lib/types` directly.
  **`progress.ts`** holds per-item answers, streaks, recent activity and
  saved decks. `_lib/streak-store.ts` and `_lib/recent-activity-store.ts`
  had no callers left once those moved, so they were deleted now rather
  than kept as re-exports until Wave 5.
- **The flashcard → question match** (the old `LEFT JOIN LATERAL`) is the
  pure `choicesForCard`, unit-tested. `pnpm parity:content` compares every
  list, every track and all 56 users' memorization answers with the old
  SQL on the production restore (228 flashcards, questions and
  memorization items, 1,342 answers, 10 glossary terms, 2 question texts
  shared by two questions each): 0 differences.
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
  a test fires two on a new track. Prisma runs these compound-key upserts
  as native `INSERT ... ON CONFLICT`, so no retry was needed.
- **`study_sessions.updated_at`** has no trigger, so `saveSession` sets it.
- **Connection budget** is now 2 (`pg`) + 3 (Prisma).
- **Stale generated types.** After deleting routes, `tsc` failed on
  `.next/types` left by an earlier `pnpm build` (Wave 1 saw the same in
  `.next/dev/types`). Deleting both is safe; build and `next dev`
  regenerate them.
- **Production needs nothing for this wave:** no migration, no schema change.

## After the waves: API reference for the frontend

Once Wave 5 lands and `src/lib/db.ts` is gone, write
`docs/superpowers/specs/<date>-api-reference.md`: the one document the
frontend reads to know which endpoint to call. It is written then, not
before, because Waves 2–5 delete and reshape routes as they go.

For every route under `src/app/api` it lists:

- method and path, and who may call it (signed in, role);
- query parameters and request body, with which fields are required;
- the response JSON, field by field, with types (timestamps are ISO
  strings) and the status codes and error bodies it can answer with;
- which page or component calls it today, and the shared type in
  `src/lib/types` that describes it, if any.

It is generated from the route handlers and their tests as they stand, not
from this document, and it says which routes were deleted in the waves so
nobody brings them back. Endpoints nothing in the frontend calls are listed
as such.
