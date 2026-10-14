-- Password reset tokens and study streaks.
-- Applied by scripts/migrate.cjs (idempotent), which also seeds one glossary term.

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Only the SHA-256 hash is stored, so a leaked table yields no usable links.
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
    ON password_reset_tokens(user_id);

CREATE TABLE IF NOT EXISTS study_streaks (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_type      exam_type NOT NULL,
    current_streak INTEGER NOT NULL DEFAULT 0,
    -- High-water mark: never decreases.
    best_streak    INTEGER NOT NULL DEFAULT 0,
    last_answer_at TIMESTAMPTZ,
    UNIQUE (user_id, exam_type)
);
