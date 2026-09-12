-- The Traditional Life decks read 50 too.
--
-- 20.sql put the 50th question back on the practice exam but deliberately left
-- the flashcard and memorization decks at 49, on the reasoning that a deck
-- which shows the same card twice teaches nothing twice. The dashboard counts
-- a deck's cards, so those two tiles still read "49 left to master" while the
-- exam handed out 50 - which is the number the reviewee is being told to
-- expect. Consistency across the three modes wins over the tidier deck.
--
-- Both inserts are guarded on the count, so re-running adds no third copy.
BEGIN;

INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'If the interest on a policy loan is not paid at the policy anniversary the insurance company may',
    'Increase the present loan by the interest'
WHERE (
        SELECT COUNT(*)
          FROM flashcards
         WHERE exam_type = 'TRADITIONAL_LIFE'
           AND front = 'If the interest on a policy loan is not paid at the policy anniversary the insurance company may'
    ) < 2;

-- sort_order is NOT NULL since 21.sql, so the options carry the order the
-- exam prints them in rather than being backfilled afterwards.
WITH restored AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'If the interest on a policy loan is not paid at the policy anniversary the insurance company may'
    WHERE (
            SELECT COUNT(*)
              FROM memorization
             WHERE exam_type = 'TRADITIONAL_LIFE'
               AND text = 'If the interest on a policy loan is not paid at the policy anniversary the insurance company may'
        ) < 2
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct, sort_order)
SELECT restored.id,
    v.text,
    v.is_correct,
    v.sort_order
FROM restored,
    (
        VALUES ('Demand full settlement of the loan', false, 1),
            ('Terminate the contract', false, 2),
            ('Refuse to grant future additional loan', false, 3),
            (
                'Increase the present loan by the interest',
                true,
                4
            )
    ) AS v(text, is_correct, sort_order);

COMMIT;

-- All three Traditional Life modes should now read 50.
SELECT exam_type,
    (
        SELECT COUNT(*)
          FROM questions q
         WHERE q.exam_type = t.exam_type
    ) AS questions,
    (
        SELECT COUNT(*)
          FROM flashcards f
         WHERE f.exam_type = t.exam_type
    ) AS flashcards,
    (
        SELECT COUNT(*)
          FROM memorization m
         WHERE m.exam_type = t.exam_type
    ) AS memorization
FROM (SELECT DISTINCT exam_type FROM questions) t
ORDER BY exam_type;
