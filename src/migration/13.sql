-- Move the seeded IIAP content onto the per-set exam types added in 12.sql.
-- Run this AFTER 12.sql has been committed on its own.
--
-- Each seeded row already carries its set in category ('IIAP_A' / 'IIAP_B'),
-- so the new exam_type is read straight off the row. 360 rows move in total,
-- 180 per set. choices and memorization_choices hang off question_id and
-- memorization_id and carry no exam_type of their own, so they follow.
BEGIN;

UPDATE questions
SET exam_type = category::exam_type
WHERE exam_type = 'IIAP';

UPDATE flashcards
SET exam_type = category::exam_type
WHERE exam_type = 'IIAP';

UPDATE memorization
SET exam_type = category::exam_type
WHERE exam_type = 'IIAP';

COMMIT;

-- Learner rows carry no category, so an 'IIAP' row here cannot be attributed
-- to a set without inventing the answer. Any that exist stay on the retired
-- value and stop appearing in the app. Expect all zeroes unless someone
-- studied IIAP while it was one combined track.
SELECT 'exam_attempts' AS table_name, count(*) FROM exam_attempts WHERE exam_type = 'IIAP'
UNION ALL SELECT 'user_progress', count(*) FROM user_progress WHERE exam_type = 'IIAP'
UNION ALL SELECT 'study_streaks', count(*) FROM study_streaks WHERE exam_type = 'IIAP'
UNION ALL SELECT 'study_sessions', count(*) FROM study_sessions WHERE exam_type = 'IIAP'
UNION ALL SELECT 'certificates', count(*) FROM certificates WHERE exam_type = 'IIAP'
UNION ALL SELECT 'vocabulary_terms', count(*) FROM vocabulary_terms WHERE exam_type = 'IIAP';
