-- Drop the study streak left on the retired IIAP track.
--
-- 13.sql moved the IIAP content onto IIAP_A and IIAP_B but left learner rows
-- alone, because a streak carries no category to say which set earned it. One
-- study_streaks row was still pointing at the retired value, at current 0 and
-- best 0, from studying IIAP while it was a single combined track. Nothing is
-- lost with both counters at zero, and the row is unreachable now that no
-- screen offers IIAP as a track.
--
-- 'IIAP' itself stays in the enum: Postgres cannot drop an enum value.
BEGIN;

DELETE FROM study_streaks
 WHERE exam_type = 'IIAP';

COMMIT;

-- Every learner table should now be clear of the retired track.
SELECT 'exam_attempts'  AS table_name, COUNT(*) FROM exam_attempts  WHERE exam_type = 'IIAP'
UNION ALL SELECT 'user_progress',  COUNT(*) FROM user_progress  WHERE exam_type = 'IIAP'
UNION ALL SELECT 'study_streaks',  COUNT(*) FROM study_streaks  WHERE exam_type = 'IIAP'
UNION ALL SELECT 'study_sessions', COUNT(*) FROM study_sessions WHERE exam_type = 'IIAP'
UNION ALL SELECT 'certificates',   COUNT(*) FROM certificates   WHERE exam_type = 'IIAP';
