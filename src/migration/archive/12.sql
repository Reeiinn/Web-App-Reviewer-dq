-- Split IIAP into its own Set A and Set B tracks.
--
-- 11.sql seeded both sets under a single 'IIAP' exam_type and told them apart
-- only by category. Everything that makes a track independent is keyed on
-- exam_type instead - user_progress and study_streaks are UNIQUE (user_id,
-- exam_type), study_sessions is UNIQUE (user_id, exam_type, mode) - so under
-- one value the two sets would have shared a progress row, a streak and a
-- resume point. They get a value each.
--
-- NOTE: this must be committed on its own before 13.sql can use the values.
-- 'IIAP' itself stays in the enum; Postgres cannot remove an enum value.
ALTER TYPE exam_type
ADD VALUE IF NOT EXISTS 'IIAP_A';

ALTER TYPE exam_type
ADD VALUE IF NOT EXISTS 'IIAP_B';
