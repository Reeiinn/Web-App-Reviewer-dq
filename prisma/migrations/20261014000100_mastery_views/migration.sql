-- Mastery counts, held once. Read-only views over existing tables: creating
-- them changes no table and no row. Rollback:
--   DROP VIEW user_track_progress; DROP VIEW track_content_totals;

CREATE VIEW track_content_totals AS
SELECT exam_type,
       count(*) FILTER (WHERE kind = 'f')::int AS flashcards,
       count(*) FILTER (WHERE kind = 'm')::int AS memorization,
       count(*) FILTER (WHERE kind = 'q')::int AS questions
  FROM (
        SELECT exam_type, 'f' AS kind FROM flashcards
        UNION ALL
        SELECT exam_type, 'm' FROM memorization
        UNION ALL
        SELECT exam_type, 'q' FROM questions
       ) content
 GROUP BY exam_type;

CREATE VIEW user_track_progress AS
SELECT user_id,
       exam_type,
       count(*) FILTER (WHERE kind = 'f' AND mastered)::int   AS flashcards_mastered,
       count(*) FILTER (WHERE kind = 'm' AND mastered)::int   AS memorization_mastered,
       count(*) FILTER (WHERE kind = 'm')::int                AS memorization_answered,
       count(*) FILTER (WHERE kind = 'm' AND is_correct)::int AS memorization_correct,
       count(*) FILTER (WHERE kind = 'q' AND mastered)::int   AS questions_mastered,
       count(*) FILTER (WHERE kind = 'a')::int                AS attempts_taken,
       count(*) FILTER (WHERE kind = 'a' AND passed)::int     AS passing_attempts,
       max(stamp) FILTER (WHERE kind IN ('f', 'm', 'q'))      AS last_reviewed_at,
       max(stamp) FILTER (WHERE kind = 's')                   AS last_answer_at
  FROM (
        SELECT fp.user_id, f.exam_type, 'f' AS kind, fp.mastered,
               NULL::boolean AS is_correct, NULL::boolean AS passed,
               fp.reviewed_at AS stamp
          FROM flashcard_progress fp JOIN flashcards f ON f.id = fp.flashcard_id
        UNION ALL
        SELECT mp.user_id, m.exam_type, 'm', mp.mastered, mp.is_correct, NULL,
               mp.reviewed_at
          FROM memorization_progress mp JOIN memorization m ON m.id = mp.memorization_id
        UNION ALL
        SELECT qp.user_id, q.exam_type, 'q', qp.mastered, NULL, NULL,
               qp.last_reviewed_at
          FROM question_progress qp JOIN questions q ON q.id = qp.question_id
        UNION ALL
        SELECT user_id, exam_type, 'a', NULL, NULL, passed, NULL
          FROM exam_attempts WHERE completed_at IS NOT NULL
        UNION ALL
        SELECT user_id, exam_type, 's', NULL, NULL, NULL, last_answer_at
          FROM study_streaks
       ) activity
 GROUP BY user_id, exam_type;
