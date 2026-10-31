# Exam choice, licensing results and bulk removal — design

**Date:** 2026-10-30
**Status:** shipped to `main` on 2026-10-31 in PR 96, with both migrations on
Railway; rebuilt on the Prisma data layer and focus tracks (see "Amendment" at
the end)
**Branch:** `dev`
**Mockup:** a throwaway clickable mockup of the four screens was reviewed and
approved before this was written. It is not part of the codebase.

## Why

Three requests from the client, all coming from day-to-day use of the app:

1. **Reviewees only prepare for some of the four exams.** Today every reviewee
   sees VUL, Traditional Life, IIAP Set A and IIAP Set B, and the console
   averages readiness across all four. A reviewee sitting only VUL looks
   "At Risk" because of three exams they will never take.
2. **Staff need to record how the real licensing exam went.** This app is a
   reviewer. The licensing exam itself happens outside it, and there is
   nowhere to say "Maria passed VUL" or "Paolo failed IIAP A, retaking".
3. **Removing reviewees is too slow.** Each removal means typing
   "Delete <full name>" and holding a button for two seconds, one person at a
   time. The client wants to tick several people, confirm once, and be done.

## Goals

- After logging in, a reviewee chooses one or more exams. Only those exams
  appear on their side of the app, and the staff console reflects the choice.
- Staff (Sales Managers for everyone, Unit Managers for their own recruits)
  can mark each of a reviewee's chosen exams **Passed** or **Failed**.
- A new staff page lists everyone who has been marked, filterable by result
  and exam.
- A **Failed** exam stays fully open for the retake. A **Passed** exam turns
  view-only: past practice exams can be reviewed, but no new sitting starts.
- The dashboard looks deliberate with 1, 2 or 3 exams, not like a four-card
  grid with holes in it.
- Staff can select several reviewees, see "Are you sure you want to remove
  these accounts?" with their names listed, and remove them with one Delete.

## Non-goals

- No change to the in-app rule that one sitting passes at 75% and five
  passing sittings clear a track and issue its certificate. The licensing
  result is a separate record and does not touch it.
- No reviewee-entered results. Only staff mark outcomes.
- No history of every mark on the results page. The page shows the current
  mark. Each change is still written to `admin_actions`, as removals are.
- No change to the Unit Manager ranking console (`/admin/field-managers`).
  "The consoles" here means the roster at `/admin`, which both Sales Managers
  and Unit Managers use.
- No undo/restore UI for removal. Removal stays a soft delete
  (`deleted_at`), as it is today.

## Anti-goals (would count as failure even if it "works")

- A reviewee who skips or never sees the picker and lands on an empty
  dashboard.
- A Unit Manager able to mark or remove someone outside their own recruits,
  by crafting a request even if the UI hides it.
- Bulk removal that half-succeeds silently: if some of the selected accounts
  could not be removed, the person must be told which and why.
- Bringing back friction to removal (typed phrases, press-and-hold).

## Terms

- **Exam / track:** the four `exam_type` values the app serves: `VUL`,
  `TRADITIONAL_LIFE`, `IIAP_A`, `IIAP_B` (`src/lib/types/common.ts`). The
  retired `IIAP` enum value is never offered.
- **Chosen exams:** the tracks a reviewee picked.
- **Licensing result / mark:** a staff-recorded `PASSED` or `FAILED` for one
  reviewee on one track. "Not marked" is the absence of a mark.

## Part 1: choosing exams

### Data

Add a nullable array column to `users`:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS exam_tracks exam_type[];
```

- `NULL` means **has not chosen yet**. Every existing account starts here, so
  existing reviewees get the picker on their next visit.
- A non-null value always holds at least one track, with no duplicates and
  never `'IIAP'`. The API enforces this, and a `CHECK
  (exam_tracks IS NULL OR cardinality(exam_tracks) >= 1)` backs it up.
- Staff accounts leave it `NULL`. It is never read for them.

This follows the existing `onboarding_tours_seen text[]` idiom on `users`.

The column goes into `scripts/migrate.cjs`, where recent additions to `users`
live. Mirror it as `src/migration/25.sql` with a header comment in the style
of the other numbered files.

### Session

`examTracks: ExamType[] | null` joins `role`, `managerId` and
`onboardingToursSeen` in the JWT and session:

- written in `auth.config.ts` `jwt()` from `user` at sign-in,
- re-read in `auth.ts` `jwt()` alongside the other claims,
- typed in `src/lib/types/next-auth.d.ts`,
- selected in `authorize()` in `auth.ts`.

After the picker saves, the client calls `update()` from `useSession`, the same
way `onboarding-tour.tsx` does, so the new choice is in the token at once
rather than after the hourly refresh. The `jwt` callback in `auth.ts` must
re-read the row when `trigger === "update"`. Check that it already does: today
it re-reads whenever `user` is absent, which covers it.

### Routing

- New page **`/choose-exams`**, learner-only (add it to `learnerOnly` in
  `auth.config.ts`, so staff are bounced to `/admin` like the other study
  screens).
- In `authorized()`: a signed-in **reviewee** whose `examTracks` is `null`,
  requesting any `learnerOnly` path other than `/choose-exams`, is redirected
  to `/choose-exams`. API routes are not redirected.
- `landingFor()` is unchanged (`/dashboard`). The redirect handles first
  arrival, so sign-in and signup need no special case.

### The picker screen

As in the mockup:

- Title "Which exams are you taking?", one line of help text, and four
  selectable cards (label + the dashboard's existing one-line blurb from
  `trackCopy` in `DashboardPage.tsx`). Cards behave as checkboxes:
  `role="checkbox"`, `aria-checked`, Space/Enter toggle.
- A live count ("2 exams selected" / "Select at least one exam"), and
  **Continue to dashboard**, disabled until at least one card is ticked.
- Uses the app's existing `AuthShell` or `InfoShell` framing, whichever reads
  closer to the mockup. Builder's call.
- Opened again from an **Edit exams** link on the dashboard, with the current
  choice pre-ticked and the button reading **Save**. From there it returns to
  `/dashboard`.
- **A track that has a licensing mark cannot be unticked.** Its card shows the
  mark ("Passed" / "Failed") and is locked on. This keeps a mark from pointing
  at an exam the reviewee no longer has. *(My call: the simplest rule that
  keeps marks and choices consistent.)*

### API

**`PUT /api/user/exams`**, body `{ tracks: ExamType[] }`:

- reviewee only (`role === "USER"`), else 403,
- zod-validated: 1–4 items, each one of the four `examTypes`, deduplicated,
- rejects removing a track that has a mark (409, message names the exam),
- writes `exam_tracks` in the canonical `examTypes` order, returns the saved
  list.

### Where the choice shows on the learner side

Everywhere a reviewee is shown a list of tracks, show only chosen ones:

- **Dashboard** track cards (see layout below).
- **Analytics** per-track sections.
- **Glossary** track filter.
- **Quick Access** (recent activity): hide entries for unchosen tracks.
- **Certificates** (`/certificates`): show chosen tracks, **plus any track
  with an earned certificate even if it is no longer chosen**. An earned
  certificate is never hidden from its owner. An unchosen track with no
  certificate is not shown. *(My call.)* `/certificates` is not in
  `learnerOnly`. Leave it that way, and have the page itself send a
  reviewee with `examTracks === null` to `/choose-exams`.

Study pages (`/learningMethods/*?exam_type=…`) that are opened with an
unchosen track redirect to `/dashboard`. *(My call. A stale bookmark should
not quietly rebuild progress on an exam they dropped.)* Progress already
recorded on an unchosen track is kept, not deleted. Re-choosing the track
brings it back.

### Dashboard layout for 1–4 exams

The `ExamTracks` grid in `DashboardPage.tsx` is `grid-cols-2` today. It
becomes count-aware:

| Chosen | Layout |
| ------ | ------ |
| 1 | One full-width card, laid out horizontally on `lg` (details left, progress + action right) |
| 2 | Two columns, as today |
| 3 | The **active** track (the one `pickActiveTrack` picks, else the first) spans the full width on top in the horizontal layout; the other two sit side by side below |
| 4 | 2 × 2, as today |

On phones the horizontal card stacks vertically. The heading reads **Your
Exams** with an **Edit exams** link at the right. The existing `TrackCard`
expand/popover behaviour and onboarding-tour anchors must keep working in
every layout.

A small pure helper (e.g. `src/lib/helper/track-layout.ts`) decides which
track goes wide and the card order. It gets unit tests for 1, 2, 3 and 4
tracks and for the "no activity yet" case.

### Staff console (roster)

`GET /api/admin/reviewees` changes:

- Select `u.exam_tracks`. For a reviewee who has chosen, `perTrack` is built
  over their chosen tracks (intersected with the `?exam_type` filter) instead
  of all four. A reviewee who has **not chosen yet** keeps today's behaviour
  (all four) and is flagged `examsChosen: false`.
- With `?exam_type=X`, reviewees who chose other exams but not X drop out of
  the roster. Reviewees who haven't chosen stay in.
- Each row gains `examTracks: ExamType[] | null` and `results` (see Part 2).

On the roster (`AdminPage.tsx`) each row shows its chosen exams as chips (the
mockup's "Exams chosen · real exam result" column). A reviewee who hasn't
chosen shows a muted "Hasn't chosen exams yet". Readiness, status and the
summary counts then naturally reflect chosen exams only, because the API
already computes them from `perTrack`.

## Part 2: licensing results

### Data

```sql
CREATE TABLE IF NOT EXISTS exam_results (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_type  exam_type NOT NULL,
  outcome    text NOT NULL CHECK (outcome IN ('PASSED', 'FAILED')),
  marked_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  marked_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exam_type)
);
```

One current mark per reviewee per exam. Clearing a mark deletes the row.
Same placement as Part 1's column: `migrate.cjs`, mirrored in `25.sql`.

### Who can mark

- `ADMIN`: any live reviewee.
- `MANAGER`: only reviewees with `manager_id = self`.
- Only on a track in the reviewee's `exam_tracks`. A reviewee who hasn't
  chosen cannot be marked yet (the chips aren't there to click).
- Enforced in the API, not just hidden in the UI. Same checks and same error
  style as the existing `DELETE /api/admin/reviewees/[id]`.

### API

**`PUT /api/admin/reviewees/[id]/results`**, body
`{ examType: ExamType, outcome: "PASSED" | "FAILED" | null }`:

- `null` clears the mark,
- upserts on `(user_id, exam_type)`, setting `marked_by`/`marked_at`,
- writes `admin_actions` with new action values `reviewee.result_marked` /
  `reviewee.result_cleared` and `detail: { examType, outcome, previous }`.
  Extend the `AdminAction` union in `audit-store.ts`,
- returns the row's updated `results`.

**`GET /api/admin/results`** (`?outcome=PASSED|FAILED`, `?exam_type=`):

- the same ADMIN/MANAGER scoping as the roster,
- returns one row per mark: reviewee id, name, email, image, exam, outcome,
  marker's name and role, `marked_at`,
- plus totals: passed, failed, and **not yet marked**, counted as chosen
  tracks with no mark across the reviewees in scope,
- live (non-deleted) reviewees only.

The roster's row payload gains
`results: Partial<Record<ExamType, { outcome, markedAt, markedBy }>>`.

### Roster UI

Each chosen-exam chip on a row reads e.g. "VUL · Not marked", "VUL ✓ Passed"
or "Traditional Life ✕ Failed", coloured neutral, green or red. Clicking a chip
opens a small menu: **Mark as Passed**, **Mark as Failed**, **Clear mark**. It
saves immediately, updates the chip in place, and shows a short confirmation
toast. Use the existing Base UI primitives for the menu, so it is
keyboard-reachable and closes on Escape or outside click.

### Results page

New route **`/admin/results`**, titled "Licensing Exam Results", in the nav for
both staff roles (`staffLinks` and `adminLinks` in `app-nav.tsx`), labelled
**Exam Results**.

- Three summary tiles: Passed, Failed (retaking), Not yet marked.
- Filter pills All / Passed / Failed, and an exam select.
- A table with Reviewee (name + email), Exam, Result, Marked by and Date.
  Failed rows read "Failed · can retake".
- Empty state: "No results match these filters." / "No results recorded yet."
- Same loading-skeleton pattern as the other admin pages (`loading.tsx`).
- Read-only. Marks are changed on the roster. *(My call, to keep one place
  where marks are edited.)*

### Effect on the reviewee

- **Failed:** nothing changes in what they can do. The track card shows a red
  **Retaking** badge.
- **Passed:** the track card turns green with a **Passed** badge. Its main
  action becomes **Review past exams** (the existing `mode=review` link the
  card already uses for in-app-passed tracks), with a note "View-only: you've
  passed this exam".
  - `POST /api/attempts` for that track returns 403 "You've passed this exam.
    Past sittings stay available to review." The practice exam page shows that
    message rather than a start button. That route both starts and resumes
    a sitting, so an unfinished sitting can't be resumed either.
    `POST /api/attempts/[id]/answers` and `/complete` refuse the same way, so a
    sitting left open when the mark lands can't be finished, and can't issue
    a certificate after it. It stays incomplete. *(My call.)*
  - The view-only review opens **whether or not the study gate is met**. A
    reviewee who passed the real exam without finishing the decks still gets
    the review, not a lock screen. Both the dashboard card and
    `PracticeExamPage.tsx`'s review path check for a Passed mark before
    checking `/api/attempts/eligibility`. *(My call.)*
  - **"Review past exams" shows the reviewee's own sittings** (the client's
    decision). See "Past sittings view" below. The dashboard card's action
    links there, not to today's `mode=review` answer-key view.

#### Past sittings view

The data is already there. `GET /api/attempts?exam_type=` lists the
signed-in reviewee's sittings. `GET /api/attempts/[id]` returns one sitting
with its answers, already scoped to the owner, their manager or an admin.
`ReviewChoices` in `PracticeExamPage.tsx` already marks a wrong pick beside
the right answer when given `chosen`.

- **List:** the reviewee's **completed** sittings for the track, newest first.
  Each row shows the date, the score as "38 / 50 · 76%", and Passed or Not
  passed against the existing 75% rule. Incomplete sittings are left out.
  An empty state says "You haven't sat a practice exam on this track."
- **Detail:** opening a row shows that paper in the order it was dealt
  (`question_order`). Each question shows the reviewee's pick against the
  correct answer, reusing `ReviewChoices`, with the score at the top. Read
  only: nothing is recorded.
- Where it lives: a mode of the existing practice exam page (for example
  `?exam_type=X&mode=history` and `&attempt=<id>`) or a new route. Builder's
  call. It must not deal a new attempt when opened, the same rule the
  existing review follows.
- Available on **any** chosen track that has completed sittings, not only
  Passed ones. A Failed or unmarked reviewee benefits from it too. Only the
  "Review past exams" entry on a Passed card is *required*. Linking to it
  from the end-of-sitting screen or a non-passed card is the builder's call.
- Passes the study gate the same way as the review above: a Passed mark
  never shows a lock screen here.
- Questions later removed from the bank (`exam_attempt_answers.question_id`
  still points at them, since the FK has no cascade) still render from the
  stored row. If a question can't be loaded, show "This question is no
  longer in the bank" in its place instead of failing the whole paper.
- Test: a helper that turns an attempt + answers into ordered review rows,
  covering a missing question and a skipped answer (`selected_choice_id`
  null).
  - Flashcards, memorization and glossary for the track stay open. *(My call:
    the client asked that passers "can still view the exams", and reading the
    decks does no harm. Only new practice sittings are stopped. Tell me if
    flashcards and memorization should be closed too.)*
- If staff clear or change a Passed mark, the track reopens immediately.

## Part 3: bulk removal

### Roster UI

- A checkbox column first in the roster table. The roster pages at 15 rows
  (`PAGE_SIZE`), so the header checkbox selects the rows **on the current
  page** and shows the indeterminate state for a partial selection. Ticks
  survive moving between pages, and the bar's count covers every page.
  Nothing is deleted unseen, because the confirmation dialog lists every
  selected name. *(My call.)*
- Selecting anything shows a bar above the table: "*n* selected",
  **Clear**, and **Remove selected**.
- **Remove selected** opens a dialog (existing `dialog-panel.tsx`):
  - Title: "Are you sure you want to remove this account?" (one) or "Are you
    sure you want to remove these *n* accounts?" (several).
  - One line: "These reviewees will be removed from the roster and won't be
    able to sign in."
  - The selected names, listed (scrolls if long).
  - **Cancel** and a red **Delete** (or "Delete *n* accounts"). A plain click,
    no typing, no hold.
- After deletion: the removed rows leave the table, the selection clears, and
  a toast says "*n* accounts removed". On a partial failure the dialog stays
  open and lists each account that was **not** removed with its reason. Those
  stay selected.
- Changing filters or search drops selected rows that no longer match from
  the selection. Rows on other pages of the same filtered list stay
  selected.
- More than 200 selected: the client sends the ids in batches of 200 and
  merges the `removed`/`skipped` results into one outcome. *(My call.)*
- The per-row **Remove** button and its typed-phrase/hold dialog
  (`RemoveReviewee`, `deletePhrase`, `samePhrase` in `AdminPage.tsx`) are
  removed. To remove one person, tick one row. If nothing else uses
  `hold-and-release-button.tsx` afterwards, delete it.

### API

**`POST /api/admin/reviewees/remove`**, body `{ ids: string[] }` (1–200 UUIDs,
zod-validated, deduplicated):

- Applies exactly the rules of today's single `DELETE` to each id: never
  self, `USER` role only, a manager only for their own recruits, live accounts
  only.
- Stamps `deleted_at` on every permitted id in one `UPDATE … WHERE id =
  ANY($1)`, and writes one `reviewee.removed` audit row per account removed.
- Returns `{ removed: [{ id, name }], skipped: [{ id, name?, reason }] }` with
  status 200 even when some were skipped. 403 only if the caller isn't staff.
- Move the per-id permission check out of `[id]/route.ts` into a shared helper
  so the single `DELETE` route and the bulk route can't drift apart. Keep the
  single `DELETE` route working, since nothing outside the UI needs to change.

## Testing

Vitest, matching the existing `src/lib/helper/*.test.ts` style. Pure logic in
helpers, tested:

- the track-layout helper (1–4 tracks, active vs. no activity),
- exam-choice validation (empty, duplicates, unknown or retired value, removing
  a marked track),
- the removal permission check (self, staff target, other manager's recruit,
  already deleted, permitted) shared by both removal routes,
- the mark permission check (admin, own manager, other manager, unchosen
  track),
- "blocked from starting a practice exam" for a passed track.

Then check by hand in the browser preview on the dev server: a fresh reviewee
is sent to the picker, the dashboard in each of the 1/2/3/4 layouts at phone
and desktop width, marking and clearing from the roster, the results page
filters, and a bulk removal including a partial failure.

## Left to the builder

- Component structure, file names for new components, and exact copy beyond
  the strings given here.
- Whether the picker uses `AuthShell` or `InfoShell`.
- Toast mechanism (reuse whatever the admin page already uses for its
  `role="status"` messages if there is no toast).
- Skeletons and loading states, following the existing pages.
- Whether `25.sql` is one file or split, as long as it is idempotent.

## Calls made without the client (check these)

1. Passed track: only **new practice exams** are blocked. Flashcards and
   memorization stay open.
2. A track with a mark can't be unticked on the picker.
3. Reviewees who haven't chosen yet appear on the roster with all four tracks
   (today's behaviour) and a "Hasn't chosen exams yet" note, and can't be marked.
4. Results are edited only from the roster. The results page is read-only.
5. Opening a study page for an unchosen exam sends the reviewee to the
   dashboard. Their old progress on it is kept.
6. The per-row Remove button goes away in favour of tick-and-remove.
7. A Passed mark opens the review even if the study gate isn't met, and
   blocks starting, resuming or finishing a practice sitting on that track.
8. The roster's header checkbox selects the current page. Ticks carry across
   pages. More than 200 are removed in batches.
9. Certificates show chosen exams plus any exam with an earned certificate.

## Decided by the client during review

- "Review past exams" on a Passed track shows the reviewee's **own past
  sittings** (list + per-sitting detail), not the answer key.

## Amendment: rebuilt on `dev` after the Prisma move (2026-10-30)

This design was first built against the raw `pg` data layer. `dev` had since
moved to Prisma and gained focus tracks
(`2026-10-14-focus-tracks-backend-design.md`), so the work was rebuilt on top
of it. Where this document and that one disagree, these replace the parts
above:

- **No `users.exam_tracks` column.** The exam pick *is* the focus-tracks pick:
  `user_focus_tracks` rows, read and written through
  `/api/user/focus-tracks`. "Not chosen yet" is `chosen: false` there. The
  session carries it as `focusTracks: ExamType[] | null` (null = never
  picked), which is what the middleware reads to send a reviewee to
  `/choose-exams` once.
- **Focus is a lens, not a lock** (focus-tracks rule 4). Study pages for an
  exam outside the pick are *not* redirected; Part 1's "study pages redirect
  to /dashboard" is dropped.
- **Roster `?exam_type=` is a zoom, not a filter** (focus-tracks spec). It no
  longer drops reviewees who did not pick that exam.
- **Data access** goes through `src/server/data/*`: `exam-results.ts` (new),
  `staff.ts` (`findActiveAccounts`, `removeReviewees`), `attempts.ts`
  (`listFinishedAttempts`), `users.ts` (the pick on sign-in and refresh).
- **Past sittings** are listed by a new `GET /api/attempts/history`;
  `GET /api/attempts` stays removed.
- **Migration** `prisma/migrations/20261030000100_exam_results`, hand-written
  and additive: one new, empty table. `exam_results` joins the
  delete-a-user test.

## Amendment: answers stay on the server during a sitting (2026-10-31)

Found in the pre-production check: `/api/questions` sent every option's
`is_correct`, and `GET /api/attempts/[id]` and `POST .../answers` said whether an
answer was right, all during an open sitting.

- `GET /api/questions` never carries `is_correct` or `explanation`.
- `GET /api/questions/answers?exam_type=` is the answer key. A reviewee may read
  it with no sitting open on that track and at least one finished, or with a
  Passed mark. Staff may always read it.
- `GET /api/attempts/[id]` reports `is_correct` only on a finished sitting, and
  `POST .../answers` never does.
- The result screen's score comes from the server. Its paper is marked from the
  key, which is read once the sitting is closed.
- While a sitting is open, past sittings and the review are refused with
  "Finish your open practice exam before reviewing the answers."

This protects the exam in progress. Flashcards and memorization still teach the
same material, so studying a track still shows its answers.

Mastery opens the practice exam, so `POST /api/memorization/[id]/progress` now
marks the answer itself and ignores any `is_correct` or `mastered` it is sent.
Flashcards stay self-rated: "Got it" is the reviewee's own call, with nothing
for the server to check.

## Amendment: sign-in fixes found in pre-release testing (2026-10-31)

Testing the real login screen turned up four faults, all fixed in this release:

- A Turnstile token is good for one attempt, and the page never fetched another.
  Each failed sign-in now remounts the widget for a new token.
- At the per-account limit the page said the password was wrong. It now says
  "Too many login attempts. Please try again later."
- At the per-address limit the middleware's reply made `signIn` throw, and the
  button spun forever. The page now recovers and says so, as does signup.
- A limiter that could not answer stopped every login. `authorize()` now fails
  open, as the middleware does. Sign-in is slow while Upstash's client retries.

## Production checklist (done 2026-10-31)

Kept for the rollback notes and for future releases. The migrations finished at
02:52:49 UTC and PR 96 merged at 02:52:54 UTC.

Without `MIGRATE_DATABASE_URL` set in the shell, Prisma uses the local one from
`.env.local` and reports "No pending migrations". Check that the `Datasource`
line names the Railway host before trusting the output.

Merging to `main` is the live deploy, so the migrations come first. The build
at `e82ba0e` runs fine on the migrated schema. This build without the two new
tables breaks sign-in for everyone.

1. Take a Railway backup.
2. From a checkout of `dev` (`main` has neither migration folder since the
   revert), set `MIGRATE_DATABASE_URL=<Railway URL>` and
   `ALLOW_REMOTE_MIGRATE=1` for these commands only.
3. `prisma migrate status` must list exactly
   `20261014000200_user_focus_tracks` and `20261030000100_exam_results` as
   pending. If `0_init` is unrecorded, do the Wave 0 baseline in
   `2026-10-14-prisma-migration-design.md` first. If either shows as already
   applied, stop and reconcile it.
4. `prisma migrate deploy`, then `prisma migrate status` again, then unset both
   variables. Each migration only creates one new, empty table.
5. From a new branch off `main`, run `git revert -m 1 2c56e7f` to undo PR 95,
   merge `dev` into that branch, and open that PR to `main`. `dev` never had the
   revert, so it can't be undone there, and a plain `dev` to `main` merge treats
   this work as already merged and leaves it out. The result should match `dev`
   exactly: `git diff --quiet HEAD dev` on that branch.
6. On production: sign in as a reviewee, pick exams, reach the dashboard, then
   open the roster and `/admin/results`. Every existing reviewee has no focus
   pick, so each is asked which exams they are taking on their next visit;
   nothing else changes until staff record a result.

Rollback is to redeploy the `e82ba0e` code and leave both tables in place, which
keeps reviewees' picks and staff marks. Dropping the tables would delete those.
