# Manager nudges — design

**Date:** 2026-09-08
**Status:** approved, ready for an implementation plan

## Problem

A manager can see on the admin console that a reviewee has slipped — the
readiness meter, the At Risk badge and "Inactive 6d" all say so — and then has
nowhere to go. The console reports; it cannot reach the person it reports on.
Chasing a reviewee happens outside the product, so nothing about it is recorded
and the reviewee reads it somewhere the study material is not.

## Scope

Both staff roles — the Sales Manager (`ADMIN`) and the Field Manager
(`MANAGER`) — can send a reviewee a short reminder from the roster. The
reviewee sees it in the app, in a bell in the top navigation.

In scope:

- A `nudges` table, one row per reminder sent.
- A send endpoint under the reviewee the nudge is about.
- A read endpoint for the signed-in reviewee's own nudges.
- Preset phrases, one press to send, plus an optional custom message.
- A bell with an unread dot in the learner navigation.

Out of scope, deliberately:

- Email, SMS and push. In-app only.
- Replies. A nudge travels one way; a conversation is a different feature.
- Rate limiting. The product owner asked for none, so the endpoint enforces
  none.
- Read receipts on the manager's side. `read_at` is stored, but no screen
  shows it yet.

## Data

One table, added to `scripts/migrate.cjs` in the idempotent style the file
already uses:

```sql
CREATE TABLE IF NOT EXISTS nudges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  sender_name text NOT NULL,
  message     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  read_at     timestamptz
);

CREATE INDEX IF NOT EXISTS nudges_user_id_idx ON nudges (user_id, created_at DESC);
```

Two decisions worth stating:

**`message` holds resolved text, not a preset key.** The phrase list will be
edited. If rows referenced a key, editing the list would silently rewrite what
managers had already sent.

**`sender_name` is a snapshot beside the `sender_id` reference.** A manager can
leave. The nudge they sent still has to say who sent it, so the name is copied
at send time and `sender_id` drops to `NULL` rather than taking the row with
it.

The reviewee's rows cascade from `users.id`, matching every other per-user
table.

## Preset phrases

`src/lib/helper/nudges.ts` owns the list and the validation. Both the manager
UI and the API import it, so the API never trusts text the client claims is a
preset — it resolves the id itself.

```ts
export const nudgePresets = [
  { id: "pending",   label: "Pending reviews",  message: "You have pending reviews waiting. Set aside 15 minutes today." },
  { id: "flashcards",label: "Flashcards",       message: "Your flashcards are due for a pass. Keep the streak alive." },
  { id: "exam",      label: "Practice exam",    message: "Your practice exam is open. Take a sitting this week." },
  { id: "behind",    label: "Falling behind",   message: "You have fallen behind schedule. Let us get you back on track." },
] as const;
```

`resolveNudge({ preset, message })` returns the text to store, or an error:

- A known preset id wins over any accompanying text.
- An unknown preset id is an error, never a silent fall-through to the custom
  message.
- Custom text is trimmed, must be non-empty after trimming, and is capped at
  200 characters.
- Neither given is an error.

The text is stored and rendered as plain text. React escapes it on the way out
and nothing renders it as HTML.

## API

**`POST /api/admin/reviewees/[id]/nudge`** — sends one nudge.

The guard ladder mirrors the DELETE handler that already lives at
`src/app/api/admin/reviewees/[id]/route.ts`, in this order: signed in, role is
`ADMIN` or `MANAGER`, target exists, target's role is `USER`, and — for a
`MANAGER` — the target's `manager_id` is the sender. Each failure gets its own
status and message rather than one blanket 403.

Body: `{ preset?: string; message?: string }`, resolved by `resolveNudge`. The
handler also calls `touchLastSeen(currentUserId)`, as every other staff route
does.

Response: `{ message: "Nudge sent to <name>." }`.

**`GET /api/nudges`** — the signed-in account's own nudges. The 20 most recent,
newest first, plus an unread count. Scoped to `user_id = session.user.id`; there
is no way to ask for somebody else's.

**`PATCH /api/nudges`** — stamps `read_at = now()` on the caller's unread rows.
Returns the new unread count, which is zero.

## Manager UI

`NudgeReviewee` sits beside `RemoveReviewee` in the Actions cell of
`src/app/admin/AdminPage.tsx`.

A bell-icon button labelled "Nudge" opens a popover holding the four presets as
buttons — one press sends and closes — and, below a divider, a "Write your own"
box with a character counter and a Send button that stays off while the box is
empty or over the cap. Success and failure both go through the console's
existing `setNotice` banner, so a nudge reports itself the same way a removal
does.

The popover follows the dismissal behaviour already written for the console's
menus: click outside and Escape both close it.

## Learner UI

`NotificationBell`, mounted in `src/components/ui/app-nav.tsx` for learner
accounts only. Staff receive no nudges, so staff get no bell.

The bell shows a dot while the unread count is above zero. Opening it lists the
nudges — sender name, message, relative time — and fires the PATCH, which
clears the dot. An empty list says so.

It fetches on mount and whenever the pathname changes. No polling interval and
no sockets: a nudge is not urgent enough to justify either, and a reviewee
moving between screens picks it up within a click.

## Testing

Vitest, alongside the existing `src/lib/helper/*.test.ts` files.

`resolveNudge` carries the logic worth testing, and the tests cover: a known
preset id resolves to its phrase; an unknown id is an error; custom text is
trimmed; empty and whitespace-only text is an error; text over 200 characters
is an error; a preset id beats an accompanying custom message; neither given is
an error.

A second unit covers recipient eligibility — the predicate behind "an `ADMIN`
may nudge any `USER`, a `MANAGER` only their own reports, and nobody may nudge
a staff account" — extracted from the route so it can be tested without a
database.

The route handlers stay thin enough that what they add over the helpers is
query plumbing.
