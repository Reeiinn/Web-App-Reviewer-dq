CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TYPE exam_type AS ENUM ('VUL', 'TRADITIONAL_LIFE');
CREATE TYPE attempt_type AS ENUM ('PRACTICE', 'MOCK');
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_type exam_type NOT NULL,
    category VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    explanation TEXT,
    difficulty SMALLINT DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_questions_exam_type ON questions(exam_type);
CREATE INDEX idx_questions_category ON questions(category);
CREATE TABLE choices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_choices_question_id ON choices(question_id);
CREATE TABLE flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_type exam_type NOT NULL,
    category VARCHAR(255) NOT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL
);
CREATE INDEX idx_flashcards_exam_type ON flashcards(exam_type);
CREATE TABLE flashcard_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    mastered BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (user_id, flashcard_id)
);
CREATE TABLE vocabulary_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_type exam_type NOT NULL,
    term VARCHAR(255) NOT NULL,
    definition TEXT NOT NULL
);
CREATE INDEX idx_vocab_exam_type ON vocabulary_terms(exam_type);
CREATE TABLE exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_type exam_type NOT NULL,
    type attempt_type NOT NULL,
    score INTEGER NOT NULL,
    total_items INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX idx_attempts_user_id ON exam_attempts(user_id);
CREATE INDEX idx_attempts_exam_type ON exam_attempts(exam_type);
CREATE TABLE exam_attempt_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id),
    selected_choice_id UUID REFERENCES choices(id),
    is_correct BOOLEAN NOT NULL
);
CREATE INDEX idx_attempt_answers_attempt_id ON exam_attempt_answers(attempt_id);
CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_type exam_type NOT NULL,
    flashcards_done INTEGER NOT NULL DEFAULT 0,
    vocab_done INTEGER NOT NULL DEFAULT 0,
    pass_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, exam_type)
);
CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exam_type exam_type NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    certificate_no VARCHAR(100) NOT NULL UNIQUE
);
CREATE INDEX idx_certificates_user_id ON certificates(user_id);
CREATE TABLE question_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_choice_id UUID REFERENCES choices(id),
    is_correct BOOLEAN NOT NULL,
    times_seen INTEGER NOT NULL DEFAULT 1,
    times_correct INTEGER NOT NULL DEFAULT 0,
    mastered BOOLEAN NOT NULL DEFAULT false,
    last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, question_id)
);
CREATE INDEX idx_question_progress_user_id ON question_progress(user_id);
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_users_updated_at BEFORE
UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_progress_updated_at BEFORE
UPDATE ON user_progress FOR EACH ROW EXECUTE FUNCTION set_updated_at();