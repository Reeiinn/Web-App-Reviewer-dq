-- Four answers corrected against the source exam's printed answer key, one
-- question's wording restored to the source, and the Traditional Life paper
-- put back to 50 items.
--
-- Each wrong answer was wrong in three places at once. The practice exam, the
-- flashcard and the memorization item each carry their own copy of the answer,
-- so a learner who checked themselves against a flashcard met the same wrong
-- answer again when they sat the exam. All three are set from one list here so
-- they cannot drift apart again.
--
-- Traditional #13 (Paid-up additions) was checked in the same pass and is
-- deliberately left alone. Its printed key says (c), but the source document's
-- own margin note says paid-up additions increase both the cash value and the
-- loan value, which is the answer already in the app; the client confirmed (a).
--
-- The Traditional paper goes back to 50. 14.sql removed a question the source
-- exam prints twice, at #35 and #39 - same stem, same four options in a
-- different order, same answer - because one sitting then served it twice.
-- The client wants the count restored: a reviewee who sat a 50-item exam
-- should finish having answered 50. The second copy is therefore intentional
-- from here on, and 14.sql must not be re-run against this database.
BEGIN;

-- The corrections, as (track, question, the answer that is actually correct).
-- The same three tables are driven off this one list below.
CREATE TEMP TABLE answer_fix (
    exam_type exam_type NOT NULL,
    qtext text NOT NULL,
    answer text NOT NULL
) ON COMMIT DROP;

INSERT INTO answer_fix (exam_type, qtext, answer)
VALUES (
        -- Traditional #6. A minor cannot hold the contract at all, so the
        -- company is not held to the contestable period the other options turn
        -- on.
        'TRADITIONAL_LIFE',
        'An insurance company generally has the right to rescind a life insurance policy if',
        'Company discovers at any time that the policy owner was actually a minor at the time of application'
    ),
    (
        -- Traditional #27. This is what non-forfeiture means; the answer the
        -- app carried was about the face amount, which is a different
        -- provision entirely.
        'TRADITIONAL_LIFE',
        'Non-forfeiture provisions are included in whole life and endowment policies to assure the policyowner that certain minimum policy benefits shall remain with him even under certain changed conditions. Non-forfeiture values guarantee to the policyowner that',
        'Any guaranteed policy values will belong to the policy owner even if premium payments are discontinued'
    ),
    (
        -- VUL #12. III is false: the policyholder has no access to the fund
        -- managers, only the life company does.
        'VUL',
        'What are the benefits available when investing in variable life funds? I. The variable life funds offer policyholders an access to pooled or diversified portfolios II. The variable life policyholders can vary his premium payments, take premium holidays, add single premium top-ups and change the level of the sum assured easily III. The variable life policyholder can have access to a pool of qualified and trained professional fund managers',
        'I & II'
    ),
    (
        -- VUL #23. III is false: the level of cover on these plans is fixed.
        'VUL',
        'Which of the following statements about single premium variable life policies are TRUE? I. There is no fixed term in a single premium variable life policy and therefore, they are technically whole life insurance II. Top-ups or single premium injections are allowed in these plans III. Policyholders have the flexibility of varying the level cover',
        'I & II'
    );

-- Every correction has to name a question that exists and an answer that is
-- one of that question's own options. Without this check a single typo in the
-- list above would set all four options false and leave the question
-- unanswerable, which no later run would notice.
DO $$
DECLARE
    missing int;
BEGIN
    SELECT COUNT(*) INTO missing
      FROM answer_fix f
     WHERE NOT EXISTS (
               SELECT 1
                 FROM questions q
                WHERE q.exam_type = f.exam_type
                  AND q.text = f.qtext
                  AND EXISTS (
                          SELECT 1
                            FROM choices c
                           WHERE c.question_id = q.id
                             AND c.text = f.answer
                      )
           );
    IF missing > 0 THEN
        RAISE EXCEPTION
            '% correction(s) name a question or an option that does not exist',
            missing;
    END IF;
END $$;

-- Practice exam.
UPDATE choices c
   SET is_correct = (c.text = f.answer)
  FROM questions q
       JOIN answer_fix f
         ON f.exam_type = q.exam_type
        AND f.qtext = q.text
 WHERE c.question_id = q.id;

-- Memorization.
UPDATE memorization_choices mc
   SET is_correct = (mc.text = f.answer)
  FROM memorization m
       JOIN answer_fix f
         ON f.exam_type = m.exam_type
        AND f.qtext = m.text
 WHERE mc.memorization_id = m.id;

-- Flashcards, which hold the answer as text on the card rather than as a set
-- of options.
UPDATE flashcards fc
   SET back = f.answer
  FROM answer_fix f
 WHERE fc.exam_type = f.exam_type
   AND fc.front = f.qtext;

-- Traditional #32 was seeded a word short of the source: "provided by life
-- insurance policies" where the exam prints "provided by the life insurance
-- policies". It reads the same, but the exam text is meant to be the exam's.
-- The flashcard is keyed on this text as its front, so it moves with it.
UPDATE questions
   SET text = 'The basic coverage provided by the life insurance policies may be supplemented by a separate provision that provides coverage for accidental amounts or of a different nature. Collectively these provisions are known as'
 WHERE exam_type = 'TRADITIONAL_LIFE'
   AND text = 'The basic coverage provided by life insurance policies may be supplemented by a separate provision that provides coverage for accidental amounts or of a different nature. Collectively these provisions are known as';

UPDATE memorization
   SET text = 'The basic coverage provided by the life insurance policies may be supplemented by a separate provision that provides coverage for accidental amounts or of a different nature. Collectively these provisions are known as'
 WHERE exam_type = 'TRADITIONAL_LIFE'
   AND text = 'The basic coverage provided by life insurance policies may be supplemented by a separate provision that provides coverage for accidental amounts or of a different nature. Collectively these provisions are known as';

UPDATE flashcards
   SET front = 'The basic coverage provided by the life insurance policies may be supplemented by a separate provision that provides coverage for accidental amounts or of a different nature. Collectively these provisions are known as'
 WHERE exam_type = 'TRADITIONAL_LIFE'
   AND front = 'The basic coverage provided by life insurance policies may be supplemented by a separate provision that provides coverage for accidental amounts or of a different nature. Collectively these provisions are known as';

-- The 50th Traditional question. Guarded on the count rather than on
-- existence, so re-running this file cannot stack up a third copy. The options
-- are in the order the source exam prints at #35, the copy 14.sql removed.
--
-- Only the exam gets the second copy. A flashcard deck and a memorization deck
-- that repeat a card teach nothing twice, so those stay at 49.
WITH restored AS (
    INSERT INTO questions (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'If the interest on a policy loan is not paid at the policy anniversary the insurance company may'
    WHERE (
            SELECT COUNT(*)
              FROM questions
             WHERE exam_type = 'TRADITIONAL_LIFE'
               AND text = 'If the interest on a policy loan is not paid at the policy anniversary the insurance company may'
        ) < 2
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT restored.id,
    v.text,
    v.is_correct
FROM restored,
    (
        VALUES ('Demand full settlement of the loan', false),
            ('Terminate the contract', false),
            ('Refuse to grant future additional loan', false),
            (
                'Increase the present loan by the interest',
                true
            )
    ) AS v(text, is_correct);

COMMIT;

-- Traditional Life should now read 50 questions against 49 flashcards and 49
-- memorization items. Every other track stays level at one of each.
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
