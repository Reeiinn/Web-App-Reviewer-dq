CREATE TABLE memorization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_type exam_type NOT NULL,
    category VARCHAR(255) NOT NULL,
    text TEXT NOT NULL
);
CREATE INDEX idx_memorization_exam_type ON memorization(exam_type);
CREATE TABLE memorization_choices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memorization_id UUID NOT NULL REFERENCES memorization(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX idx_memorization_choices_memorization_id ON memorization_choices(memorization_id);
CREATE TABLE memorization_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    memorization_id UUID NOT NULL REFERENCES memorization(id) ON DELETE CASCADE,
    selected_choice_id UUID REFERENCES memorization_choices(id),
    is_correct BOOLEAN,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    mastered BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (user_id, memorization_id)
);