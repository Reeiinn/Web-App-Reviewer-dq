-- The repeated Traditional question is printed twice, two different ways.
--
-- The exam asks "If the interest on a policy loan is not paid at the policy
-- anniversary the insurance company may" at both #35 and #39, with the same
-- four options shuffled between the two printings:
--
--   #35   a. Demand full settlement   ...   d. Increase the present loan
--   #39   a. Increase the present loan ...  d. Demand full settlement
--
-- The answer is the same sentence both times, but it is (d) at #35 and (a) at
-- #39, and the printed key says exactly that. 21.sql keyed its ordering table
-- on the question text, so the two rows collapsed to one entry and both copies
-- were dealt #35's order - which left the copy standing in for #39 showing its
-- answer at (d) where the reviewer prints (a).
--
-- One copy each, then. Which row takes which printing is decided by id, so it
-- is settled and repeatable rather than left to chance; between them the two
-- copies reproduce both printings, as the paper does.
BEGIN;

-- The #39 printing.
CREATE TEMP TABLE second_printing (texts text[] NOT NULL) ON COMMIT DROP;
INSERT INTO second_printing (texts)
VALUES (
        ARRAY['Increase the present loan by the interest',
              'Terminate the contract',
              'Refuse to grant future additional loan',
              'Demand full settlement of the loan']
    );

WITH copies AS (
    SELECT id,
           row_number() OVER (ORDER BY id) AS copy
      FROM questions
     WHERE exam_type = 'TRADITIONAL_LIFE'
       AND text = 'If the interest on a policy loan is not paid at the policy anniversary the insurance company may'
)
UPDATE choices c
   SET sort_order = array_position(s.texts, c.text)
  FROM copies, second_printing s
 WHERE c.question_id = copies.id
   AND copies.copy = 2
   AND array_position(s.texts, c.text) IS NOT NULL;

-- The memorization deck carries the same question twice as well, so it follows
-- the same split.
WITH copies AS (
    SELECT id,
           row_number() OVER (ORDER BY id) AS copy
      FROM memorization
     WHERE exam_type = 'TRADITIONAL_LIFE'
       AND text = 'If the interest on a policy loan is not paid at the policy anniversary the insurance company may'
)
UPDATE memorization_choices mc
   SET sort_order = array_position(s.texts, mc.text)
  FROM copies, second_printing s
 WHERE mc.memorization_id = copies.id
   AND copies.copy = 2
   AND array_position(s.texts, mc.text) IS NOT NULL;

COMMIT;

-- One copy should now answer at (d) and the other at (a), matching #35 and #39.
SELECT row_number() OVER (ORDER BY q.id) AS copy,
       (
        SELECT string_agg(
                   CASE WHEN c.is_correct THEN upper(letter) ELSE letter END,
                   ''
                   ORDER BY c.sort_order
               )
          FROM (
                SELECT c.is_correct,
                       c.sort_order,
                       substr('abcd', c.sort_order::int, 1) AS letter
                  FROM choices c
                 WHERE c.question_id = q.id
               ) c
       ) AS answer_at
  FROM questions q
 WHERE q.exam_type = 'TRADITIONAL_LIFE'
   AND q.text = 'If the interest on a policy loan is not paid at the policy anniversary the insurance company may';
