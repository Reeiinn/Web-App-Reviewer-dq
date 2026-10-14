# Focus tracks (backend) — design

**Date:** 2026-10-14
**Status:** approved, ready for an implementation plan
**Depends on:** [Prisma migration](2026-10-14-prisma-migration-design.md),
Wave 0 (the Prisma client and `src/server/data/mastery.ts`).

## Ground rules (from Nelson)

The ground rules in the Prisma migration spec apply here unchanged. In short:
existing data is never affected and every migration is additive; nothing is
pushed to the Railway database during development, only to a local database
Nelson provides; production is applied by Nelson from the checklist below;
commits are Nelson's alone; pull requests target `dev`.

## Problem

Every reviewee is scored on all four tracks — VUL, Traditional Life, IIAP
(Set A) and IIAP (Set B) — whether they are sitting one exam or all of them.
Someone preparing only for VUL who has mastered it reads as 25% ready on the
dashboard and on the staff roster, and the roster calls them behind.

## Scope

A reviewee picks one or more tracks to focus on, and can change or add to the
pick at any time from their settings. Summaries — the dashboard, eligibility,
Quick Access, streaks and the staff roster — are scoped to those tracks.

In scope: the table, the data module, the settings endpoint, and scoping the
summary endpoints. Backend only.

Out of scope:

- The picker screen and settings UI (a later frontend spec). Until it ships,
  nobody has a selection, so every screen behaves exactly as it does today.
- Locking tracks. A reviewee can still open, study and sit any track.
- Backfilling a selection for existing users.

## Rules

1. **No saved selection means all four tracks.** This is the state of every
   existing user and every new signup, and it is never written as rows.
2. **A saved selection has at least one track.** Clearing every track is
   refused; "all four" is expressed by having no selection.
3. **Tracks always come back in the standard order** (`examTypes` in
   `src/lib/types/common.ts`), whatever order they were picked in.
4. **Focus is a lens, not a lock.** Endpoints called with an explicit track
   serve that track whether or not it is in focus.
5. **Unpicking a track deletes nothing.** Its progress, attempts, streaks and
   certificate stay, and reappear when it is picked again.
6. **Certificates and the five-pass rule stay per track.**

## Data

Migration `<timestamp>_user_focus_tracks`, hand-written and additive:

```sql
CREATE TABLE user_focus_tracks (
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_type  exam_type   NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exam_type)
);
```

The primary key serves the per-user lookup, so no further index is needed.
`ON DELETE CASCADE` follows the rule in the Prisma spec, and the table is added
to its delete-a-user test.

## Data module

`src/server/data/focus-tracks.ts`:

- `getFocusTracks(userId)` → `{ tracks: ExamType[]; chosen: boolean }`
- `getFocusTracksFor(userIds)` → `Map<string, { tracks; chosen }>`, one query
  for the whole roster
- `setFocusTracks(userId, tracks)` → replaces the selection inside one
  `prisma.$transaction` (delete the user's rows, insert the new set)

Rules 1 and 3 live in a pure function, `resolveFocusTracks(saved)`, so they are
tested without a database.

## Settings endpoint

`src/app/api/user/focus-tracks/route.ts`:

- `GET` → `{ tracks, chosen }`
- `PUT` with `{ tracks: ExamType[] }` → saves and returns `{ tracks, chosen: true }`

The body is validated with zod: between 1 and 4 entries, each a valid
`ExamType`, no duplicates. A bad body answers 400 with `{ error }`, like every
other route.

Reviewees only: staff accounts get 403, since staff oversee rather than study
and their progress is never shown. Not signed in gets 401. The write limiter in
`src/middleware.ts` already applies to every non-GET request outside
`/api/auth`, so `PUT` here is limited with no change.

## Scoped endpoints

| Endpoint | Change |
| -------- | ------ |
| `GET /api/progress` (dashboard) | Returns only focus tracks |
| `GET /api/attempts/eligibility`, all-tracks form | Returns only focus tracks; the `?exam_type=` form is unchanged (rule 4) |
| `GET /api/recent-activity` | Returns only focus tracks. The filter goes in the query, before its `LIMIT`, so Quick Access still fills to its usual count |
| `GET /api/streaks` | Returns only focus tracks |
| `GET /api/admin/reviewees` | Per reviewee, scores only that reviewee's focus tracks (below) |

Roster details:

- `readiness` is the mean over the reviewee's focus tracks, and `status`
  follows from it.
- `practiceExam.passedTracks`, `practiceExam.tracks` and `byExam` cover focus
  tracks only.
- The summed count columns (`flashcards`, `memorize`, `practice`) sum focus
  tracks only.
- Each row gains `focusTracks: { tracks, chosen }`. This is additive; no
  existing field changes shape.
- `?exam_type=X` still shows track X for every reviewee, in focus or not.
  It's a zoom-in, not a filter on who is listed.

Not affected: the study endpoints (flashcards, memorization, questions,
glossary, attempts for a named track), certificates, and
`admin/managers`, which computes no readiness.

## Testing

- `resolveFocusTracks`: none saved means all four in order; a subset comes back
  in order. Duplicates cannot be stored (primary key), so it does not handle
  them.
- zod schema: rejects empty, more than 4, unknown tracks and duplicates.
- `focus-tracks.ts` against the local database: set, replace, read for one
  user and for many, cascade on user delete.
- Roster: a reviewee focused on VUL alone, with VUL fully mastered and passed
  five times, comes out at 100% readiness and the ready status, with
  `passedTracks` 1 of 1.
- No selection: the output of every scoped endpoint is identical to what it
  returned before this spec, checked with the parity script from the Prisma
  spec.
- Route tests: 401 signed out, 403 for staff, 400 on a bad body, 200 round trip.

## Production checklist (Nelson runs this, after merge)

1. Take a Railway backup.
2. With `MIGRATE_DATABASE_URL=<Railway URL>` and `ALLOW_REMOTE_MIGRATE=1`
   set for this command only, `prisma migrate deploy` applies the
   focus-tracks migration, which only creates an empty table.
3. Confirm the dashboard and roster numbers are unchanged; with no selections
   saved, they must be.

Rollback is `DROP TABLE user_focus_tracks;`, which touches no other table.
