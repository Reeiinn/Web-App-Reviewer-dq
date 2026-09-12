-- The wording follows the printed reviewers exactly, mistakes and all.
--
-- A word-by-word comparison against the three source PDFs turned up seven
-- places where the app read better than the paper it came from: somewhere
-- between the exam and the seed, "knows as" had been tidied to "is known as",
-- "by and agent" to "by an agent", "as the are" to "as they are", and so on.
-- Every one of them is a mistake in the source. They are being put back.
--
-- The reviewee sits this exam against the printed reviewer in front of them,
-- and a word that differs reads as the app being wrong even when the app is
-- the one that is right. Matching the paper is what makes the two usable side
-- by side, so the source wins over the grammar.
--
-- Four of these are question text, which flashcards and memorization key on as
-- their front, so all three tables move together. Two are option text, one of
-- which is also a flashcard's answer.
--
-- Not touched: Traditional #13 (the printed key's (c) against the source's own
-- margin note and the app's (a) - the client confirmed (a)), and the four
-- answers 20.sql corrected, which are what the printed answer keys say.
--
-- sort_order is per choice row and survives an edit to the text, so nothing
-- needs re-ordering here. 21.sql has been regenerated from the seeds so a
-- fresh install matches these strings too.
BEGIN;

-- Question text. Each string moves in questions, memorization and the
-- flashcard that fronts it.
CREATE TEMP TABLE stem_fix (before text NOT NULL, after text NOT NULL)
    ON COMMIT DROP;

INSERT INTO stem_fix (before, after)
VALUES (
        -- Traditional #19. The exam prints "approach knows as".
        'An agent who determines a prospect''s complete financial requirements preparatory to offering him a policy using the correct selling approach is known as',
        'An agent who determines a prospect''s complete financial requirements preparatory to offering him a policy using the correct selling approach knows as'
    ),
    (
        -- Traditional #21. The exam prints "that the maturity", not "at".
        'Notwithstanding various possible legal impediments, if the owner of an endowment at age 65 policy tells you that at maturity of the policy he wants to provide his church with a monthly donation for as long as the church exists, which option do you recommend?',
        'Notwithstanding various possible legal impediments, if the owner of an endowment at age 65 policy tells you that the maturity of the policy he wants to provide his church with a monthly donation for as long as the church exists, which option do you recommend?'
    ),
    (
        -- Traditional True/False #4. No comma after "premiums", and no "the"
        -- before "paid up insurance option".
        'True or False: A policy is still in force for the full face amount and will remain in force for a further period of four years and 118 days, without the payment of any premiums, has availed of the paid up insurance option.',
        'True or False: A policy is still in force for the full face amount and will remain in force for a further period of four years and 118 days, without the payment of any premiums has availed of paid up insurance option.'
    ),
    (
        -- VUL #9, statement II. The exam prints "as the are account driven".
        'Which of the following statements about the difference between variable life policies and endowment policies are FALSE? I. The policy values of variable life policies directly reflect the performance of the fund of the life company II. The premiums and benefits of the endowment policies are described at the inception of the policy whereas variable life are flexible as they are account driven III. The benefits and risks of variable life and endowment policies directly accrue to the policyholders',
        'Which of the following statements about the difference between variable life policies and endowment policies are FALSE? I. The policy values of variable life policies directly reflect the performance of the fund of the life company II. The premiums and benefits of the endowment policies are described at the inception of the policy whereas variable life are flexible as the are account driven III. The benefits and risks of variable life and endowment policies directly accrue to the policyholders'
    ),
    (
        -- VUL #39. The exam prints "by and agent through".
        'The objective of satisfying customers need profitably can be achieved by an agent through I. The giving of freebies to the customers II. Extensive investment training by the company III. The use of sales plan, where sales goals, strategies, and objectives are coordinated with the market analysis, segmentation and training IV. The giving of monetary assistance and discount to the customers',
        'The objective of satisfying customers need profitably can be achieved by and agent through I. The giving of freebies to the customers II. Extensive investment training by the company III. The use of sales plan, where sales goals, strategies, and objectives are coordinated with the market analysis, segmentation and training IV. The giving of monetary assistance and discount to the customers'
    );

UPDATE questions q SET text = f.after FROM stem_fix f WHERE q.text = f.before;
UPDATE memorization m SET text = f.after FROM stem_fix f WHERE m.text = f.before;
UPDATE flashcards fc SET front = f.after FROM stem_fix f WHERE fc.front = f.before;

-- Option text. Traditional #27's option is also the answer on its flashcard,
-- so the card's back moves with it; IIAP Set B #5's is a distractor, so no
-- card refers to it.
CREATE TEMP TABLE option_fix (before text NOT NULL, after text NOT NULL)
    ON COMMIT DROP;

INSERT INTO option_fix (before, after)
VALUES (
        -- Traditional #27 (b). The exam prints "discounted".
        'Any guaranteed policy values will belong to the policy owner even if premium payments are discontinued',
        'Any guaranteed policy values will belong to the policy owner even if premium payments are discounted'
    ),
    (
        -- IIAP Set B #5 (b). The exam prints "a life insurance is not
        -- allowed", with no "agent".
        'a life insurance agent is not allowed to identify on his letterhead the name of the insurer he represents.',
        'a life insurance is not allowed to identify on his letterhead the name of the insurer he represents.'
    );

UPDATE choices c SET text = f.after FROM option_fix f WHERE c.text = f.before;
UPDATE memorization_choices mc SET text = f.after FROM option_fix f WHERE mc.text = f.before;
UPDATE flashcards fc SET back = f.after FROM option_fix f WHERE fc.back = f.before;

COMMIT;

-- Nothing should still be carrying the old wording. Every count is expected
-- to come back zero.
SELECT (SELECT COUNT(*) FROM questions WHERE text ILIKE '%correct selling approach is known as%') AS q19,
       (SELECT COUNT(*) FROM questions WHERE text ILIKE '%tells you that at maturity%') AS q21,
       (SELECT COUNT(*) FROM questions WHERE text ILIKE '%of any premiums, has availed of the paid up%') AS tf4,
       (SELECT COUNT(*) FROM questions WHERE text ILIKE '%flexible as they are account driven%') AS vul9,
       (SELECT COUNT(*) FROM questions WHERE text ILIKE '%achieved by an agent through%') AS vul39,
       (SELECT COUNT(*) FROM choices WHERE text ILIKE '%premium payments are discontinued%') AS trad27,
       (SELECT COUNT(*) FROM choices WHERE text ILIKE '%a life insurance agent is not allowed to identify%') AS setb5;
