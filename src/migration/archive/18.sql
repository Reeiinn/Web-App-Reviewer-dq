-- Removing a reviewee stops destroying them, and starts being recorded.
--
-- The console's removal ran DELETE FROM users, and everything a learner had
-- ever done cascaded with the row: progress, attempts, streaks, certificates.
-- There was no undo, and no record anywhere of who had done it — a support
-- question about a missing account had no answer in the database at all.
--
-- Removal is now a stamp on the row. Every screen filters on it, so the account
-- disappears from the roster and cannot sign in, but the work is still there
-- when someone asks what happened.
BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- The roster and every sign-in look up live accounts, so the index is on the
-- rows that remain rather than on the column.
CREATE INDEX IF NOT EXISTS users_active_idx
  ON users (id) WHERE deleted_at IS NULL;

-- What a staff account did, kept whether or not the target still exists.
--
-- actor_id and target_id are set null rather than cascading: the point of the
-- record is that it outlives the rows it describes, and the email and name
-- alongside them are copied at the time so a deleted account is still legible.
CREATE TABLE IF NOT EXISTS admin_actions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_email  text NOT NULL,
  actor_role   text NOT NULL,
  action       text NOT NULL,
  target_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  target_email text,
  target_name  text,
  detail       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_actions_created_at_idx
  ON admin_actions (created_at DESC);

CREATE INDEX IF NOT EXISTS admin_actions_target_idx
  ON admin_actions (target_id);

COMMIT;
