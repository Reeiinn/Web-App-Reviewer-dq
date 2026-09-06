-- Remove exactly-duplicated questions.
--
-- Traditional Life carried 50 question rows against 49 flashcards and 49
-- memorization items, because one question was inserted twice: same text, same
-- four choices, same correct answer. /api/questions returns every row, so a
-- practice exam served that question twice in one sitting.
--
-- Matching on the text alone would be wrong. IIAP Set B has three questions
-- that share the stem 'Which of the following statements is correct?' and then
-- ask about rebating, licence renewal and commission sharing respectively -
-- different questions with different choices. So a row only counts as a copy
-- when its text AND its whole answer set match another row's.
--
-- Rows carrying learner history are left alone even when duplicated; deleting
-- one would cascade away that learner's progress and attempt answers.
BEGIN;

WITH fingerprinted AS (
    SELECT q.id,
           q.exam_type,
           q.text,
           (
               SELECT string_agg(
                          c.text || '|' || c.is_correct,
                          E'\n'
                          ORDER BY c.text, c.is_correct
                      )
                 FROM choices c
                WHERE c.question_id = q.id
           ) AS answer_set
      FROM questions q
),
ranked AS (
    SELECT id,
           row_number() OVER (
               PARTITION BY exam_type, text, answer_set
               ORDER BY id
           ) AS copy
      FROM fingerprinted
)
DELETE FROM questions
 WHERE id IN (SELECT id FROM ranked WHERE copy > 1)
   AND NOT EXISTS (
       SELECT 1 FROM question_progress p WHERE p.question_id = questions.id
   )
   AND NOT EXISTS (
       SELECT 1 FROM exam_attempt_answers a WHERE a.question_id = questions.id
   );

COMMIT;

-- choices rows cascade with their question, so the counts should now line up
-- per track: one question, one flashcard and one memorization item each.
SELECT exam_type,
       (SELECT COUNT(*) FROM questions     q WHERE q.exam_type = t.exam_type) AS questions,
       (SELECT COUNT(*) FROM flashcards    f WHERE f.exam_type = t.exam_type) AS flashcards,
       (SELECT COUNT(*) FROM memorization  m WHERE m.exam_type = t.exam_type) AS memorization
  FROM (SELECT DISTINCT exam_type FROM questions) t
 ORDER BY exam_type;
