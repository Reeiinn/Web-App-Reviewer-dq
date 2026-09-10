// Idempotent schema migration for the RENEVIEW redesign.
// Run with: node scripts/migrate.cjs
require("dotenv").config({ path: ".env.local" });

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const statements = [
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
     id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     token_hash text NOT NULL UNIQUE,
     expires_at timestamptz NOT NULL,
     used_at    timestamptz,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,

  `CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
     ON password_reset_tokens (user_id)`,

  `CREATE TABLE IF NOT EXISTS study_streaks (
     id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     exam_type      exam_type NOT NULL,
     current_streak integer NOT NULL DEFAULT 0,
     best_streak    integer NOT NULL DEFAULT 0,
     last_answer_at timestamptz,
     UNIQUE (user_id, exam_type)
   )`,

  // Where a learner stopped in a deck, so reopening a track resumes on the same
  // card from any device instead of dealing a fresh deck from card 1.
  `CREATE TABLE IF NOT EXISTS study_sessions (
     id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     exam_type  exam_type NOT NULL,
     mode       text NOT NULL,
     card_order jsonb NOT NULL DEFAULT '[]'::jsonb,
     card_index integer NOT NULL DEFAULT 0,
     ratings    jsonb NOT NULL DEFAULT '{}'::jsonb,
     updated_at timestamptz NOT NULL DEFAULT now(),
     UNIQUE (user_id, exam_type, mode)
   )`,

  `CREATE INDEX IF NOT EXISTS study_sessions_user_id_idx
     ON study_sessions (user_id)`,

  // Last time a learner opened a study mode on a track, for the dashboard's
  // Quick Access panel. Unlike study_sessions this is never deleted, so a
  // finished deck still shows up as recently visited.
  `CREATE TABLE IF NOT EXISTS recent_activity (
     id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     exam_type  exam_type NOT NULL,
     mode       text NOT NULL,
     visited_at timestamptz NOT NULL DEFAULT now(),
     UNIQUE (user_id, exam_type, mode)
   )`,

  `CREATE INDEX IF NOT EXISTS recent_activity_user_id_idx
     ON recent_activity (user_id)`,

  // The profile photo lives with the account as a data URL. It is capped at a
  // few tens of kilobytes by the upload route, so a column beats standing up
  // object storage for one small square per user.
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS image text`,

  // An answer is now saved the moment it is picked, so changing a choice has
  // to overwrite the earlier row rather than add a second one — two rows for
  // one question would both count toward the score. Older duplicates go first,
  // newest kept, so the constraint can be added.
  `DELETE FROM exam_attempt_answers a
    USING exam_attempt_answers b
    WHERE a.attempt_id = b.attempt_id
      AND a.question_id = b.question_id
      AND a.ctid < b.ctid`,

  `ALTER TABLE exam_attempt_answers
     DROP CONSTRAINT IF EXISTS exam_attempt_answers_attempt_question_key`,

  `ALTER TABLE exam_attempt_answers
     ADD CONSTRAINT exam_attempt_answers_attempt_question_key
     UNIQUE (attempt_id, question_id)`,

  // The paper is dealt once per sitting and kept with the attempt, so a
  // refresh returns to the same questions in the same order rather than
  // reshuffling under answers the learner has already given.
  `ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS question_order jsonb`,

  // Reminders a manager sends a reviewee. The text is stored resolved rather
  // than as a preset key, so editing the phrase list cannot rewrite what was
  // already sent; sender_name is snapshotted beside sender_id so a nudge from
  // a manager who has since left still says who sent it.
  `CREATE TABLE IF NOT EXISTS nudges (
     id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     sender_id   uuid REFERENCES users(id) ON DELETE SET NULL,
     sender_name text NOT NULL,
     message     text NOT NULL,
     created_at  timestamptz NOT NULL DEFAULT now(),
     read_at     timestamptz
   )`,

  `CREATE INDEX IF NOT EXISTS nudges_user_id_idx
     ON nudges (user_id, created_at DESC)`,

  // An invite now says what it creates. Existing rows are reviewee links, so
  // the default keeps them working untouched.
  `ALTER TABLE registration_invites
     ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'USER'`,

  // Set when the invite was addressed to somebody: signup then refuses any
  // other address, so a forwarded link cannot be spent by the wrong person.
  // Null keeps the open link the reviewee invite has always been.
  `ALTER TABLE registration_invites
     ADD COLUMN IF NOT EXISTS email text`,

  // Removal from the console is a stamp rather than a DELETE, so a reviewee's
  // work survives the removal and can be restored. Every read filters on it.
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz`,

  `CREATE INDEX IF NOT EXISTS users_active_idx
     ON users (id) WHERE deleted_at IS NULL`,

  // What a staff account did, kept whether or not the target still exists.
  // The actor's and target's details are copied in at the time so the record
  // stays legible after either account is gone.
  `CREATE TABLE IF NOT EXISTS admin_actions (
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
   )`,

  `CREATE INDEX IF NOT EXISTS admin_actions_created_at_idx
     ON admin_actions (created_at DESC)`,

  `CREATE INDEX IF NOT EXISTS admin_actions_target_idx
     ON admin_actions (target_id)`,

  // The structured half of a glossary term: its examples, comparison table and
  // key points, which used to be flattened into the definition paragraph.
  `ALTER TABLE vocabulary_terms ADD COLUMN IF NOT EXISTS details jsonb`,

  // Terms are upserted on (exam_type, term) below, which needs a constraint to
  // be idempotent against. Any duplicates from before it are folded down to the
  // earliest row.
  `DELETE FROM vocabulary_terms a
    USING vocabulary_terms b
    WHERE a.exam_type = b.exam_type
      AND a.term = b.term
      AND a.ctid > b.ctid`,

  `CREATE UNIQUE INDEX IF NOT EXISTS vocabulary_terms_exam_term_key
     ON vocabulary_terms (exam_type, term)`,
];

// The glossary as its source document has it, so the page renders against real
// content. Edits to the seed file land on the next run.
const seedTerms = require("./glossary-seed.cjs");

(async () => {
  const client = await pool.connect();
  try {
    for (const sql of statements) {
      await client.query(sql);
      console.log("ok  " + sql.trim().split("\n")[0]);
    }

    for (const seed of seedTerms) {
      await client.query(
        `INSERT INTO vocabulary_terms (exam_type, term, definition, details)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (exam_type, term)
         DO UPDATE SET definition = EXCLUDED.definition,
                       details    = EXCLUDED.details`,
        [
          seed.exam_type,
          seed.term,
          seed.definition,
          seed.details ? JSON.stringify(seed.details) : null,
        ],
      );
    }
    console.log(`ok  seeded ${seedTerms.length} vocabulary terms`);

    console.log("\nMigration complete.");
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();
