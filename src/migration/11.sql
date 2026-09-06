-- IIAP seed data: Set A and Set B, all questions included in questions, flashcards, and memorization
-- Run this AFTER 5_add_iiap_type.sql has been committed on its own
BEGIN;
-- Set A
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A single premium policy means a policy'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'requiring only a single premium each year',
                false
            ),
            (
                'under which only one premium payment is required',
                true
            ),
            ('only available to single individuals', false),
            (
                'on which no more than one premium can be paid in advance',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'A single premium policy means a policy',
        'under which only one premium payment is required'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A single premium policy means a policy'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'requiring only a single premium each year',
                false
            ),
            (
                'under which only one premium payment is required',
                true
            ),
            ('only available to single individuals', false),
            (
                'on which no more than one premium can be paid in advance',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A fixed amount added to the premium of a given policy regardless of policy size is known as'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('policy fee', true),
            ('policy reserve', false),
            ('policy values', false),
            ('extra premium', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'A fixed amount added to the premium of a given policy regardless of policy size is known as',
        'policy fee'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A fixed amount added to the premium of a given policy regardless of policy size is known as'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('policy fee', true),
            ('policy reserve', false),
            ('policy values', false),
            ('extra premium', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'To be able to calculate the required premiums for a given policy, the agent must know the applicant''s'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('age', false),
            ('choice of plan', false),
            ('face amount desired', false),
            ('all of the above', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'To be able to calculate the required premiums for a given policy, the agent must know the applicant''s',
        'all of the above'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'To be able to calculate the required premiums for a given policy, the agent must know the applicant''s'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('age', false),
            ('choice of plan', false),
            ('face amount desired', false),
            ('all of the above', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'To calculate premiums for the other modes of premium payment, the annual premium is'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'divided by the desired number of premium payments',
                false
            ),
            (
                'divided by a conversion factor for the mode of payment desired',
                false
            ),
            (
                'multiplied by a conversion factor for the mode of payment desired',
                true
            ),
            (
                'multiplied by a constant conversion factor',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'To calculate premiums for the other modes of premium payment, the annual premium is',
        'multiplied by a conversion factor for the mode of payment desired'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'To calculate premiums for the other modes of premium payment, the annual premium is'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'divided by the desired number of premium payments',
                false
            ),
            (
                'divided by a conversion factor for the mode of payment desired',
                false
            ),
            (
                'multiplied by a conversion factor for the mode of payment desired',
                true
            ),
            (
                'multiplied by a constant conversion factor',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A father enters into a life insurance contract on behalf of his child. In this case, the father is the'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('insured', false),
            ('beneficiary', false),
            ('insurer', false),
            ('applicant-owner', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'A father enters into a life insurance contract on behalf of his child. In this case, the father is the',
        'applicant-owner'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A father enters into a life insurance contract on behalf of his child. In this case, the father is the'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('insured', false),
            ('beneficiary', false),
            ('insurer', false),
            ('applicant-owner', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'The convertible feature of a term insurance policy provides that the policy may be'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'changed to a permanent insurance policy without evidence of insurability',
                true
            ),
            ('changed to another life', false),
            ('cashed for a guaranteed sum', false),
            (
                'changed to permanent insurance with evidence of insurability',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'The convertible feature of a term insurance policy provides that the policy may be',
        'changed to a permanent insurance policy without evidence of insurability'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'The convertible feature of a term insurance policy provides that the policy may be'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'changed to a permanent insurance policy without evidence of insurability',
                true
            ),
            ('changed to another life', false),
            ('cashed for a guaranteed sum', false),
            (
                'changed to permanent insurance with evidence of insurability',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Within two years of buying a life insurance policy, you are accidentally killed when your car hits a tree. In these circumstances the insurance company will'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('refund premium because it is suicide', false),
            ('pay double the face amount', false),
            ('pay the face amount', true),
            ('pay nothing', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Within two years of buying a life insurance policy, you are accidentally killed when your car hits a tree. In these circumstances the insurance company will',
        'pay the face amount'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Within two years of buying a life insurance policy, you are accidentally killed when your car hits a tree. In these circumstances the insurance company will'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('refund premium because it is suicide', false),
            ('pay double the face amount', false),
            ('pay the face amount', true),
            ('pay nothing', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'When explaining dividends, the following information must be supplied'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('that they are not guaranteed', true),
            (
                'the dividends paid-up in the previous years',
                false
            ),
            ('the anticipated dividends', false),
            ('the relation to the cost of the policy', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'When explaining dividends, the following information must be supplied',
        'that they are not guaranteed'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'When explaining dividends, the following information must be supplied'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('that they are not guaranteed', true),
            (
                'the dividends paid-up in the previous years',
                false
            ),
            ('the anticipated dividends', false),
            ('the relation to the cost of the policy', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Part of the premium paid by a policyholder is invested by the insurance company. In premium computation, this factor is known as'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('interest', true),
            ('investment', false),
            ('loading', false),
            ('mortality', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Part of the premium paid by a policyholder is invested by the insurance company. In premium computation, this factor is known as',
        'interest'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Part of the premium paid by a policyholder is invested by the insurance company. In premium computation, this factor is known as'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('interest', true),
            ('investment', false),
            ('loading', false),
            ('mortality', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'The parties involved in life insurance contract are the'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('insurance company and agent', false),
            ('insurance company and insured', true),
            ('agent and insured', false),
            ('insured and beneficiary', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'The parties involved in life insurance contract are the',
        'insurance company and insured'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'The parties involved in life insurance contract are the'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('insurance company and agent', false),
            ('insurance company and insured', true),
            ('agent and insured', false),
            ('insured and beneficiary', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'The fundamental advantage of the use of insurance as a means of meeting economic losses is that through insurance these losses are'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('spread over a large number of people', true),
            ('deferred for a specified period of time', false),
            (
                'reduced for the group as a whole through the multiplier effect',
                false
            ),
            (
                'met as they arise through savings accumulated on an assessment basis',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'The fundamental advantage of the use of insurance as a means of meeting economic losses is that through insurance these losses are',
        'spread over a large number of people'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'The fundamental advantage of the use of insurance as a means of meeting economic losses is that through insurance these losses are'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('spread over a large number of people', true),
            ('deferred for a specified period of time', false),
            (
                'reduced for the group as a whole through the multiplier effect',
                false
            ),
            (
                'met as they arise through savings accumulated on an assessment basis',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Life insurance contributes directly to the welfare and progress of the country by'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'accumulating capital for investment in commerce and industry',
                false
            ),
            (
                'partially relieving the community of the care of dependents',
                false
            ),
            ('encouraging provisions for the future', false),
            ('all of the above', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Life insurance contributes directly to the welfare and progress of the country by',
        'all of the above'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Life insurance contributes directly to the welfare and progress of the country by'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'accumulating capital for investment in commerce and industry',
                false
            ),
            (
                'partially relieving the community of the care of dependents',
                false
            ),
            ('encouraging provisions for the future', false),
            ('all of the above', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'The number of years that persons at a given age will live on the average as shown by the mortality table is called'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('law of large numbers', false),
            ('life income option', false),
            ('life annuity', false),
            ('life expectancy', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'The number of years that persons at a given age will live on the average as shown by the mortality table is called',
        'life expectancy'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'The number of years that persons at a given age will live on the average as shown by the mortality table is called'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('law of large numbers', false),
            ('life income option', false),
            ('life annuity', false),
            ('life expectancy', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'An insurance plan which offers both protection and savings is called'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('Temporary Plan', false),
            ('Permanent Plan', true),
            ('Participating Plan', false),
            ('Non-participating Plan', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'An insurance plan which offers both protection and savings is called',
        'Permanent Plan'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'An insurance plan which offers both protection and savings is called'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Temporary Plan', false),
            ('Permanent Plan', true),
            ('Participating Plan', false),
            ('Non-participating Plan', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A man with moderate means can have maximum protection possible through'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('20 Yr. Endowment', false),
            ('Limited Pay Life', false),
            ('Term Insurance', true),
            ('Whole Life Insurance', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'A man with moderate means can have maximum protection possible through',
        'Term Insurance'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A man with moderate means can have maximum protection possible through'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('20 Yr. Endowment', false),
            ('Limited Pay Life', false),
            ('Term Insurance', true),
            ('Whole Life Insurance', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Mr. Juan Valdez wants a policy which will entitle him to receive dividends yearly. What will you recommend to Mr. Valdez?'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('Participating', true),
            ('Non-participating Plans', false),
            ('Term Insurance', false),
            ('None of the above', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Mr. Juan Valdez wants a policy which will entitle him to receive dividends yearly. What will you recommend to Mr. Valdez?',
        'Participating'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Mr. Juan Valdez wants a policy which will entitle him to receive dividends yearly. What will you recommend to Mr. Valdez?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Participating', true),
            ('Non-participating Plans', false),
            ('Term Insurance', false),
            ('None of the above', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Which of the following can give the longest protection?'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('20 Yr. Endowment', false),
            ('Endowment at 65', false),
            ('Ordinary Life', true),
            ('20 Yr. Term', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Which of the following can give the longest protection?',
        'Ordinary Life'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Which of the following can give the longest protection?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('20 Yr. Endowment', false),
            ('Endowment at 65', false),
            ('Ordinary Life', true),
            ('20 Yr. Term', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'An Individual, at age 35, purchases a policy under which he will in 20 years receive the face amount of the policy himself if he is still alive at that date. This policy is obviously a'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('20 Yr. Endowment', true),
            ('20 Pay Life', false),
            ('20 Yr. Term', false),
            ('None of the above', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'An Individual, at age 35, purchases a policy under which he will in 20 years receive the face amount of the policy himself if he is still alive at that date. This policy is obviously a',
        '20 Yr. Endowment'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'An Individual, at age 35, purchases a policy under which he will in 20 years receive the face amount of the policy himself if he is still alive at that date. This policy is obviously a'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('20 Yr. Endowment', true),
            ('20 Pay Life', false),
            ('20 Yr. Term', false),
            ('None of the above', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_A', 'In a 20 Life policy')
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'protection is until age 100, payment of premium is for 20 years',
                true
            ),
            (
                'protection is until age 100, payment of premium until age 100',
                false
            ),
            (
                'protection is for 20 years, payment of premium is for 20 years',
                false
            ),
            (
                'protection is for 20 years, payment of premium until age 100',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'In a 20 Life policy',
        'protection is until age 100, payment of premium is for 20 years'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_A', 'In a 20 Life policy')
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'protection is until age 100, payment of premium is for 20 years',
                true
            ),
            (
                'protection is until age 100, payment of premium until age 100',
                false
            ),
            (
                'protection is for 20 years, payment of premium is for 20 years',
                false
            ),
            (
                'protection is for 20 years, payment of premium until age 100',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A participating plan entitles the policyowner to receive a return of excess premium. Such is termed as:'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('endowment', false),
            ('dividends', true),
            ('cash value', false),
            ('cash surrender value', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'A participating plan entitles the policyowner to receive a return of excess premium. Such is termed as:',
        'dividends'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A participating plan entitles the policyowner to receive a return of excess premium. Such is termed as:'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('endowment', false),
            ('dividends', true),
            ('cash value', false),
            ('cash surrender value', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Mrs. Rose Cortez owns a policy which does not provide for the build up of cash values and whose premiums remain level. Mrs. Cortez owns:'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('Ordinary Life', false),
            ('Limited Pay Life', false),
            ('Decreasing Term', false),
            ('Level Term', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Mrs. Rose Cortez owns a policy which does not provide for the build up of cash values and whose premiums remain level. Mrs. Cortez owns:',
        'Level Term'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Mrs. Rose Cortez owns a policy which does not provide for the build up of cash values and whose premiums remain level. Mrs. Cortez owns:'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Ordinary Life', false),
            ('Limited Pay Life', false),
            ('Decreasing Term', false),
            ('Level Term', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Two attractive features of a Term insurance are:'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('convertibility and cash values', false),
            ('cash values and dividends', false),
            ('protection and dividends', false),
            ('convertibility and renewability', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Two attractive features of a Term insurance are:',
        'convertibility and renewability'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Two attractive features of a Term insurance are:'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('convertibility and cash values', false),
            ('cash values and dividends', false),
            ('protection and dividends', false),
            ('convertibility and renewability', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A term insurance which allows the policyowners to convert it to a permanent insurance within a specified period without evidence of insurability contains _____ features:'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('convertibility', true),
            ('renewability', false),
            ('dividend option', false),
            ('both a & b', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'A term insurance which allows the policyowners to convert it to a permanent insurance within a specified period without evidence of insurability contains _____ features:',
        'convertibility'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A term insurance which allows the policyowners to convert it to a permanent insurance within a specified period without evidence of insurability contains _____ features:'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('convertibility', true),
            ('renewability', false),
            ('dividend option', false),
            ('both a & b', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_A', 'A term policy only offers')
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('cash values', false),
            ('protection', true),
            ('savings', false),
            ('dividends', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'A term policy only offers',
        'protection'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_A', 'A term policy only offers')
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('cash values', false),
            ('protection', true),
            ('savings', false),
            ('dividends', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'The main difference between a term plan and a permanent plan is'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'permanent plans provide both protection and savings while term plans offer protection only',
                true
            ),
            (
                'permanent plans provides savings and dividends while term plans provide savings only',
                false
            ),
            (
                'permanent plans can be converted and renewed while term plans cannot',
                false
            ),
            ('all of the above', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'The main difference between a term plan and a permanent plan is',
        'permanent plans provide both protection and savings while term plans offer protection only'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'The main difference between a term plan and a permanent plan is'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'permanent plans provide both protection and savings while term plans offer protection only',
                true
            ),
            (
                'permanent plans provides savings and dividends while term plans provide savings only',
                false
            ),
            (
                'permanent plans can be converted and renewed while term plans cannot',
                false
            ),
            ('all of the above', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'The savings element of permanent plans allows for the build up of'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('dividends', false),
            ('cash values', true),
            ('maturity benefits', false),
            ('death benefits', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'The savings element of permanent plans allows for the build up of',
        'cash values'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'The savings element of permanent plans allows for the build up of'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('dividends', false),
            ('cash values', true),
            ('maturity benefits', false),
            ('death benefits', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_A', 'A term rider is')
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('a term policy with a waiver of premium', false),
            (
                'another name for a convertible term policy',
                false
            ),
            ('a renewable term policy', false),
            (
                'a term insurance added to a permanent plan',
                true
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'A term rider is',
        'a term insurance added to a permanent plan'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_A', 'A term rider is')
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('a term policy with a waiver of premium', false),
            (
                'another name for a convertible term policy',
                false
            ),
            ('a renewable term policy', false),
            (
                'a term insurance added to a permanent plan',
                true
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'An optional rider which can be attached to a policy stopping further premium payment in the event of disability is called'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('policyholder protection clause', false),
            ('accidental death and dismemberment', false),
            ('waiver of premium', true),
            ('total disability monthly income', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'An optional rider which can be attached to a policy stopping further premium payment in the event of disability is called',
        'waiver of premium'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'An optional rider which can be attached to a policy stopping further premium payment in the event of disability is called'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('policyholder protection clause', false),
            ('accidental death and dismemberment', false),
            ('waiver of premium', true),
            ('total disability monthly income', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'For the waiver of premium to be effective'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('disability must be total', false),
            ('disability must be permanent', false),
            ('both a & b', true),
            ('either a or b', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'For the waiver of premium to be effective',
        'both a & b'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'For the waiver of premium to be effective'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('disability must be total', false),
            ('disability must be permanent', false),
            ('both a & b', true),
            ('either a or b', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Disability benefits are not paid'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('for self-inflicted injuries', true),
            ('if there is a loan against the policy', false),
            (
                'if all the policy dividends have been withdrawn',
                false
            ),
            (
                'if disability resulted from sickness only',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Disability benefits are not paid',
        'for self-inflicted injuries'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Disability benefits are not paid'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('for self-inflicted injuries', true),
            ('if there is a loan against the policy', false),
            (
                'if all the policy dividends have been withdrawn',
                false
            ),
            (
                'if disability resulted from sickness only',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Mr. Pedro Cruz became paralyzed as a result of jumping out of the window in an attempt to commit suicide. Under the usual provisions of a disability income policy, he would be entitled to'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'receive the total disability income benefit and the waiver of premiums',
                false
            ),
            ('receive partial disability benefits', false),
            ('be granted the waiver of premium', false),
            (
                'receive neither disability income nor waiver of premiums',
                true
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Mr. Pedro Cruz became paralyzed as a result of jumping out of the window in an attempt to commit suicide. Under the usual provisions of a disability income policy, he would be entitled to',
        'receive neither disability income nor waiver of premiums'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Mr. Pedro Cruz became paralyzed as a result of jumping out of the window in an attempt to commit suicide. Under the usual provisions of a disability income policy, he would be entitled to'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'receive the total disability income benefit and the waiver of premiums',
                false
            ),
            ('receive partial disability benefits', false),
            ('be granted the waiver of premium', false),
            (
                'receive neither disability income nor waiver of premiums',
                true
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A person wanting a greater coverage for the least amount of premium has an option of attaching what rider in his permanent life policy?'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('a waiver of premium', false),
            ('term insurance rider', true),
            ('guaranteed insurability rider', false),
            ('accidental death rider', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'A person wanting a greater coverage for the least amount of premium has an option of attaching what rider in his permanent life policy?',
        'term insurance rider'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A person wanting a greater coverage for the least amount of premium has an option of attaching what rider in his permanent life policy?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('a waiver of premium', false),
            ('term insurance rider', true),
            ('guaranteed insurability rider', false),
            ('accidental death rider', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'One supplementary benefit offered is a payor''s benefit which is intended to'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'provide for the return of premiums to an adult payor in the event that a minor insured dies',
                false
            ),
            (
                'provide a waiver of premium benefit in the event of death or disability of the person paying the premium',
                true
            ),
            (
                'allow the insurance company to pay the policy''s proceeds to the person who seems equitable entitled to the proceeds',
                false
            ),
            (
                'assure that the adult payor will retain a vested in the policy when the insured reaches the age of majority',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'One supplementary benefit offered is a payor''s benefit which is intended to',
        'provide a waiver of premium benefit in the event of death or disability of the person paying the premium'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'One supplementary benefit offered is a payor''s benefit which is intended to'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'provide for the return of premiums to an adult payor in the event that a minor insured dies',
                false
            ),
            (
                'provide a waiver of premium benefit in the event of death or disability of the person paying the premium',
                true
            ),
            (
                'allow the insurance company to pay the policy''s proceeds to the person who seems equitable entitled to the proceeds',
                false
            ),
            (
                'assure that the adult payor will retain a vested in the policy when the insured reaches the age of majority',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'If an insured is disabled and his life insurance policy is being continued in force through the waiver of premium, the dividends of the policy would'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('cease', false),
            ('continue at reduced rate', false),
            (
                'continue as if the owner is paying the premium',
                true
            ),
            (
                'continue but they would be applied toward the premium being waived',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'If an insured is disabled and his life insurance policy is being continued in force through the waiver of premium, the dividends of the policy would',
        'continue as if the owner is paying the premium'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'If an insured is disabled and his life insurance policy is being continued in force through the waiver of premium, the dividends of the policy would'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('cease', false),
            ('continue at reduced rate', false),
            (
                'continue as if the owner is paying the premium',
                true
            ),
            (
                'continue but they would be applied toward the premium being waived',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A policy with a minor as the proposed insured is called'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('rated policy', false),
            ('juvenile policy', true),
            ('regular policy', false),
            ('substandard policy', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'A policy with a minor as the proposed insured is called',
        'juvenile policy'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A policy with a minor as the proposed insured is called'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('rated policy', false),
            ('juvenile policy', true),
            ('regular policy', false),
            ('substandard policy', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Life insurance policies for which higher than standard premium rates are payable are said to be'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('rated policies', true),
            ('contingent policies', false),
            ('non-participating policies', false),
            ('conditional policies', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Life insurance policies for which higher than standard premium rates are payable are said to be',
        'rated policies'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Life insurance policies for which higher than standard premium rates are payable are said to be'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('rated policies', true),
            ('contingent policies', false),
            ('non-participating policies', false),
            ('conditional policies', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Since the purchase of life insurance is a voluntary choice, the individual must meet'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('comprehensive inspection report', false),
            (
                'certain standards of health and occupation',
                true
            ),
            ('minimum income requirement', false),
            ('all of the above', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Since the purchase of life insurance is a voluntary choice, the individual must meet',
        'certain standards of health and occupation'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Since the purchase of life insurance is a voluntary choice, the individual must meet'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('comprehensive inspection report', false),
            (
                'certain standards of health and occupation',
                true
            ),
            ('minimum income requirement', false),
            ('all of the above', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Which of the following factors would have the least effect on the premium charged for life insurance'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('age', false),
            ('occupation', false),
            ('income', true),
            ('all of the above', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Which of the following factors would have the least effect on the premium charged for life insurance',
        'income'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Which of the following factors would have the least effect on the premium charged for life insurance'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('age', false),
            ('occupation', false),
            ('income', true),
            ('all of the above', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Insurance Companies have various sources of information about the insured. These are'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('application form', false),
            ('medical information bureau', false),
            ('inspection report', false),
            ('all of the above', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Insurance Companies have various sources of information about the insured. These are',
        'all of the above'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Insurance Companies have various sources of information about the insured. These are'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('application form', false),
            ('medical information bureau', false),
            ('inspection report', false),
            ('all of the above', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_A', 'Anti-selection occurs')
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'when an agent thinks only of his own interest and not of his policyowners',
                false
            ),
            (
                'when you purchase bad stocks with expectation that they will improve',
                false
            ),
            (
                'when the insurance company accepts more than its share of poor risks',
                false
            ),
            (
                'when persons in poor health wish to buy insurance',
                true
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Anti-selection occurs',
        'when persons in poor health wish to buy insurance'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_A', 'Anti-selection occurs')
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'when an agent thinks only of his own interest and not of his policyowners',
                false
            ),
            (
                'when you purchase bad stocks with expectation that they will improve',
                false
            ),
            (
                'when the insurance company accepts more than its share of poor risks',
                false
            ),
            (
                'when persons in poor health wish to buy insurance',
                true
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_A', 'In insurance, risk means')
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'chances of you being declined by the company',
                false
            ),
            ('hazard on people''s lives', true),
            ('chances of the beneficiary being paid', false),
            ('none of the above', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'In insurance, risk means',
        'hazard on people''s lives'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_A', 'In insurance, risk means')
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'chances of you being declined by the company',
                false
            ),
            ('hazard on people''s lives', true),
            ('chances of the beneficiary being paid', false),
            ('none of the above', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'In an application, the information that must be disclosed include'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('only his date and place of birth', false),
            ('only his family history', false),
            (
                'every fact in his knowledge that is material to the insurance',
                true
            ),
            (
                'only information he wants the agent to know',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'In an application, the information that must be disclosed include',
        'every fact in his knowledge that is material to the insurance'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'In an application, the information that must be disclosed include'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('only his date and place of birth', false),
            ('only his family history', false),
            (
                'every fact in his knowledge that is material to the insurance',
                true
            ),
            (
                'only information he wants the agent to know',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'In insurance risks are classified as'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('unacceptable and acceptable', false),
            ('regular and irregular', false),
            ('standard, substandard and declined', true),
            ('complete and incomplete', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'In insurance risks are classified as',
        'standard, substandard and declined'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'In insurance risks are classified as'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('unacceptable and acceptable', false),
            ('regular and irregular', false),
            ('standard, substandard and declined', true),
            ('complete and incomplete', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A risk is considered substandard based on any or all of the following criteria'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('death, occupation and moral character', false),
            (
                'occupation, moral character and family health history',
                true
            ),
            (
                'income, educational attainment and occupation',
                false
            ),
            (
                'death, income and educational background',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'A risk is considered substandard based on any or all of the following criteria',
        'occupation, moral character and family health history'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A risk is considered substandard based on any or all of the following criteria'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('death, occupation and moral character', false),
            (
                'occupation, moral character and family health history',
                true
            ),
            (
                'income, educational attainment and occupation',
                false
            ),
            (
                'death, income and educational background',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A hazardous occupation could be defined as'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'an occupation the duties of which expose the insured to a degree of danger of sustaining injury',
                false
            ),
            (
                'an occupation in an unhealthy working condition exposing the insured to elements which can cause sickness',
                false
            ),
            (
                'an occupation which exposes the insured to social hazards',
                false
            ),
            ('all of the above', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'A hazardous occupation could be defined as',
        'all of the above'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A hazardous occupation could be defined as'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'an occupation the duties of which expose the insured to a degree of danger of sustaining injury',
                false
            ),
            (
                'an occupation in an unhealthy working condition exposing the insured to elements which can cause sickness',
                false
            ),
            (
                'an occupation which exposes the insured to social hazards',
                false
            ),
            ('all of the above', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Statements in the application forms are'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('guarantees', false),
            ('representations', true),
            ('warranties', false),
            ('none of the above', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Statements in the application forms are',
        'representations'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Statements in the application forms are'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('guarantees', false),
            ('representations', true),
            ('warranties', false),
            ('none of the above', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'An agent is filling up the Agent''s Confidential Report. What information must he put in his report?'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'information about insured''s standing in the community',
                false
            ),
            ('information about insured''s finances', false),
            (
                'all information he knows which are material to the application for insurance',
                true
            ),
            ('a & b only', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'An agent is filling up the Agent''s Confidential Report. What information must he put in his report?',
        'all information he knows which are material to the application for insurance'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'An agent is filling up the Agent''s Confidential Report. What information must he put in his report?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'information about insured''s standing in the community',
                false
            ),
            ('information about insured''s finances', false),
            (
                'all information he knows which are material to the application for insurance',
                true
            ),
            ('a & b only', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Mr. Roel Reyes has been confined in a hospital 3 years prior to his application for insurance. He, therefore, needs to give the following information'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'name of attending doctor, diagnosis, date of confinement',
                true
            ),
            ('the bill and medicines', false),
            ('name of doctor only', false),
            ('date of confinement only', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Mr. Roel Reyes has been confined in a hospital 3 years prior to his application for insurance. He, therefore, needs to give the following information',
        'name of attending doctor, diagnosis, date of confinement'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Mr. Roel Reyes has been confined in a hospital 3 years prior to his application for insurance. He, therefore, needs to give the following information'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'name of attending doctor, diagnosis, date of confinement',
                true
            ),
            ('the bill and medicines', false),
            ('name of doctor only', false),
            ('date of confinement only', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Insurance companies have a source of confidential medical information on applicants for life insurance. This is the'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('agents confidential report bureau', false),
            ('inspection reports bureau', false),
            ('financial standing bureau', false),
            ('medical impairment bureau', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Insurance companies have a source of confidential medical information on applicants for life insurance. This is the',
        'medical impairment bureau'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Insurance companies have a source of confidential medical information on applicants for life insurance. This is the'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('agents confidential report bureau', false),
            ('inspection reports bureau', false),
            ('financial standing bureau', false),
            ('medical impairment bureau', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Insurance companies which are owned by the policyowners are examples of'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('stock companies', false),
            ('mutual companies', true),
            ('family corporation', false),
            ('open-end companies', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Insurance companies which are owned by the policyowners are examples of',
        'mutual companies'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Insurance companies which are owned by the policyowners are examples of'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('stock companies', false),
            ('mutual companies', true),
            ('family corporation', false),
            ('open-end companies', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_A', 'Stock companies are owned by')
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('policyowners', false),
            ('stockholders', true),
            ('creditors', false),
            ('government', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Stock companies are owned by',
        'stockholders'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_A', 'Stock companies are owned by')
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('policyowners', false),
            ('stockholders', true),
            ('creditors', false),
            ('government', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Why is it important that the application is the basis of the policy?'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'because the completed application is the basis of the policy contract and the company may accept or reject an application based on the information given in the application',
                true
            ),
            (
                'for the agent to have available data of his prospect in connection with future sales',
                false
            ),
            (
                'to avoid the necessity of the insurer putting all relevant details in the contract',
                false
            ),
            ('none of the above', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Why is it important that the application is the basis of the policy?',
        'because the completed application is the basis of the policy contract and the company may accept or reject an application based on the information given in the application'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Why is it important that the application is the basis of the policy?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'because the completed application is the basis of the policy contract and the company may accept or reject an application based on the information given in the application',
                true
            ),
            (
                'for the agent to have available data of his prospect in connection with future sales',
                false
            ),
            (
                'to avoid the necessity of the insurer putting all relevant details in the contract',
                false
            ),
            ('none of the above', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Which one of the following statements is correct?'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'advertising by life insurance agents is prohibited',
                false
            ),
            (
                'all information about a client or a prospective client has to be treated as confidential',
                true
            ),
            (
                'the agents should always recommend the amount and type of policy to a prospective client which would be profitable for the company',
                false
            ),
            (
                'when an agent advertises his services in the press, he is not allowed to state the name of his company',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Which one of the following statements is correct?',
        'all information about a client or a prospective client has to be treated as confidential'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Which one of the following statements is correct?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'advertising by life insurance agents is prohibited',
                false
            ),
            (
                'all information about a client or a prospective client has to be treated as confidential',
                true
            ),
            (
                'the agents should always recommend the amount and type of policy to a prospective client which would be profitable for the company',
                false
            ),
            (
                'when an agent advertises his services in the press, he is not allowed to state the name of his company',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Choose the incorrect statement: The entire contract between the policyowner and the insurance company include:'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('the application and the policy', false),
            (
                'any verbal statement made by the agent to the application',
                true
            ),
            (
                'any document attached to the policy when issued',
                false
            ),
            (
                'any subsequent written amendments to the contract',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Choose the incorrect statement: The entire contract between the policyowner and the insurance company include:',
        'any verbal statement made by the agent to the application'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Choose the incorrect statement: The entire contract between the policyowner and the insurance company include:'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('the application and the policy', false),
            (
                'any verbal statement made by the agent to the application',
                true
            ),
            (
                'any document attached to the policy when issued',
                false
            ),
            (
                'any subsequent written amendments to the contract',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_A', 'Life insurance is')
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('a luxury afforded by the rich', false),
            ('only available to a specific group', false),
            ('a cooperative risk-sharing plan', true),
            ('a speculative risk', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Life insurance is',
        'a cooperative risk-sharing plan'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_A', 'Life insurance is')
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('a luxury afforded by the rich', false),
            ('only available to a specific group', false),
            ('a cooperative risk-sharing plan', true),
            ('a speculative risk', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A life insurance company earns income from two main sources'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('premium income and investment income', true),
            ('mortgage income and premium income', false),
            ('dividend income and interest income', false),
            ('mortgage income and dividend income', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'A life insurance company earns income from two main sources',
        'premium income and investment income'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'A life insurance company earns income from two main sources'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('premium income and investment income', true),
            ('mortgage income and premium income', false),
            ('dividend income and interest income', false),
            ('mortgage income and dividend income', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'The official who makes the necessary assumption and calculation with respect to the principal elements of life insurance premium in order to arrive at the premium rates to be charged is the'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('life agent', false),
            ('senior statistician', false),
            ('Insurance Commissioner', false),
            ('Actuary', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'The official who makes the necessary assumption and calculation with respect to the principal elements of life insurance premium in order to arrive at the premium rates to be charged is the',
        'Actuary'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'The official who makes the necessary assumption and calculation with respect to the principal elements of life insurance premium in order to arrive at the premium rates to be charged is the'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('life agent', false),
            ('senior statistician', false),
            ('Insurance Commissioner', false),
            ('Actuary', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_A', 'The term loading means')
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'the difference between the gross and net premiums for the purpose of paying the insurance overhead expenses including commissions and taxes',
                true
            ),
            (
                'the amount which the company will lend to the policyholder with the policy as a security',
                false
            ),
            (
                'the amount payable in the event of the occurrence of a loss which renders him unfit for insurance',
                false
            ),
            ('None of the above', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'The term loading means',
        'the difference between the gross and net premiums for the purpose of paying the insurance overhead expenses including commissions and taxes'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_A', 'The term loading means')
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'the difference between the gross and net premiums for the purpose of paying the insurance overhead expenses including commissions and taxes',
                true
            ),
            (
                'the amount which the company will lend to the policyholder with the policy as a security',
                false
            ),
            (
                'the amount payable in the event of the occurrence of a loss which renders him unfit for insurance',
                false
            ),
            ('None of the above', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Life insurance can provide money when income stops because of'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('disability', false),
            ('death', false),
            ('retirement', false),
            ('all of the above', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'Life insurance can provide money when income stops because of',
        'all of the above'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'Life insurance can provide money when income stops because of'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('disability', false),
            ('death', false),
            ('retirement', false),
            ('all of the above', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'The three elements that make up a life insurance premium are'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'mortality experience, investment earnings and operating expenses',
                true
            ),
            (
                'cash values, dividends and paid up values',
                false
            ),
            (
                'cash values, loan values and paid up values',
                false
            ),
            (
                'past dividend experience, present dividend and projected interest',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_A',
        'The three elements that make up a life insurance premium are',
        'mortality experience, investment earnings and operating expenses'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_A',
            'The three elements that make up a life insurance premium are'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'mortality experience, investment earnings and operating expenses',
                true
            ),
            (
                'cash values, dividends and paid up values',
                false
            ),
            (
                'cash values, loan values and paid up values',
                false
            ),
            (
                'past dividend experience, present dividend and projected interest',
                false
            )
    ) AS v(text, is_correct);
-- Set B
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'If the insured dies during the grace period of an unpaid life insurance policy, the amount payable to the beneficiary is usually the'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('total premium paid plus interest.', false),
            (
                'cash surrender value of the policy minus the unpaid premium.',
                false
            ),
            (
                'face amount of the policy minus the unpaid premium.',
                true
            ),
            ('full face amount.', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'If the insured dies during the grace period of an unpaid life insurance policy, the amount payable to the beneficiary is usually the',
        'face amount of the policy minus the unpaid premium.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'If the insured dies during the grace period of an unpaid life insurance policy, the amount payable to the beneficiary is usually the'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('total premium paid plus interest.', false),
            (
                'cash surrender value of the policy minus the unpaid premium.',
                false
            ),
            (
                'face amount of the policy minus the unpaid premium.',
                true
            ),
            ('full face amount.', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Which of the following statements is correct?'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'an insurance agent''s license will be renewed when the Commissioner is satisfied that the information in the application is accurate and all requirements are met.',
                true
            ),
            (
                'an insurance agent''s license is valid only for one month.',
                false
            ),
            (
                'an insurance agent''s license is valid during the lifetime of the agent.',
                false
            ),
            (
                'an insurance agent''s license will be renewed when the corresponding application and fee are received by the Insurance Commissioner.',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Which of the following statements is correct?',
        'an insurance agent''s license will be renewed when the Commissioner is satisfied that the information in the application is accurate and all requirements are met.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Which of the following statements is correct?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'an insurance agent''s license will be renewed when the Commissioner is satisfied that the information in the application is accurate and all requirements are met.',
                true
            ),
            (
                'an insurance agent''s license is valid only for one month.',
                false
            ),
            (
                'an insurance agent''s license is valid during the lifetime of the agent.',
                false
            ),
            (
                'an insurance agent''s license will be renewed when the corresponding application and fee are received by the Insurance Commissioner.',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The insurance industry is under government regulations because'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'it is required to account for money spent in company operations.',
                false
            ),
            ('it pays high taxes.', false),
            ('it affects public interest.', true),
            ('it is a charitable institution.', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'The insurance industry is under government regulations because',
        'it affects public interest.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The insurance industry is under government regulations because'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'it is required to account for money spent in company operations.',
                false
            ),
            ('it pays high taxes.', false),
            ('it affects public interest.', true),
            ('it is a charitable institution.', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Which of the following statements is correct?'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'an agent is allowed to share commissions when selling a whole life policy but not when selling a term policy.',
                false
            ),
            (
                'an agent is allowed to share commissions with another licensed agent or agents but with no one else.',
                true
            ),
            (
                'sharing the commission with any other person is called twisting.',
                false
            ),
            (
                'an agent is not allowed to share commissions with any person.',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Which of the following statements is correct?',
        'an agent is allowed to share commissions with another licensed agent or agents but with no one else.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Which of the following statements is correct?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'an agent is allowed to share commissions when selling a whole life policy but not when selling a term policy.',
                false
            ),
            (
                'an agent is allowed to share commissions with another licensed agent or agents but with no one else.',
                true
            ),
            (
                'sharing the commission with any other person is called twisting.',
                false
            ),
            (
                'an agent is not allowed to share commissions with any person.',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Which of the following statements is correct?'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'rebating of premiums can only be authorized by the head office of the insurer.',
                false
            ),
            (
                'a life insurance agent is not allowed to identify on his letterhead the name of the insurer he represents.',
                false
            ),
            (
                'life insurance agents are allowed to act for two insurers at the same time under the same license.',
                false
            ),
            (
                'rebating of premiums by an insurance agent is prohibited.',
                true
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Which of the following statements is correct?',
        'rebating of premiums by an insurance agent is prohibited.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Which of the following statements is correct?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'rebating of premiums can only be authorized by the head office of the insurer.',
                false
            ),
            (
                'a life insurance agent is not allowed to identify on his letterhead the name of the insurer he represents.',
                false
            ),
            (
                'life insurance agents are allowed to act for two insurers at the same time under the same license.',
                false
            ),
            (
                'rebating of premiums by an insurance agent is prohibited.',
                true
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Persuading a policyowner, directly or indirectly, to surrender or lapse a policy in one company and replacing it with a policy from another company is'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('rebating', false),
            ('twisting', true),
            ('knocking', false),
            ('discounting', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Persuading a policyowner, directly or indirectly, to surrender or lapse a policy in one company and replacing it with a policy from another company is',
        'twisting'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Persuading a policyowner, directly or indirectly, to surrender or lapse a policy in one company and replacing it with a policy from another company is'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('rebating', false),
            ('twisting', true),
            ('knocking', false),
            ('discounting', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Interest is charged on policy loans'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('for registered policies only.', false),
            (
                'if the loan is outstanding for more than a year. A loan repaid within a year is interest free.',
                false
            ),
            (
                'to replace investment income the insurer cannot earn since a loan has been granted.',
                true
            ),
            ('for participating policies only.', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Interest is charged on policy loans',
        'to replace investment income the insurer cannot earn since a loan has been granted.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Interest is charged on policy loans'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('for registered policies only.', false),
            (
                'if the loan is outstanding for more than a year. A loan repaid within a year is interest free.',
                false
            ),
            (
                'to replace investment income the insurer cannot earn since a loan has been granted.',
                true
            ),
            ('for participating policies only.', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_B', 'Rebating is')
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('dating the policy a month in advance.', false),
            ('giving false information.', false),
            ('twisting.', false),
            (
                'premium discrimination against policyholders.',
                true
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Rebating is',
        'premium discrimination against policyholders.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_B', 'Rebating is')
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('dating the policy a month in advance.', false),
            ('giving false information.', false),
            ('twisting.', false),
            (
                'premium discrimination against policyholders.',
                true
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'An insurance agent''s license can be revoked for'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('fraudulent practices.', false),
            (
                'violation of any provision of the Insurance code.',
                false
            ),
            (
                'misrepresentation in the application for license.',
                false
            ),
            ('any or all of the above.', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'An insurance agent''s license can be revoked for',
        'any or all of the above.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'An insurance agent''s license can be revoked for'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('fraudulent practices.', false),
            (
                'violation of any provision of the Insurance code.',
                false
            ),
            (
                'misrepresentation in the application for license.',
                false
            ),
            ('any or all of the above.', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'One example covered under the ethical practices and procedures is'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'keep all policyholders information confidential.',
                true
            ),
            ('always recommend a will.', false),
            ('never drink in front of clients.', false),
            (
                'always pick up the first premium with the application for insurance.',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'One example covered under the ethical practices and procedures is',
        'keep all policyholders information confidential.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'One example covered under the ethical practices and procedures is'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'keep all policyholders information confidential.',
                true
            ),
            ('always recommend a will.', false),
            ('never drink in front of clients.', false),
            (
                'always pick up the first premium with the application for insurance.',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_B', 'The term knocking means')
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'promising to pay to two annuitants a fixed annual income as long as both survive.',
                false
            ),
            (
                'making derogatory remarks about competing underwriters or companies.',
                true
            ),
            (
                'the number of years that person at a given age will live on the average as shown by the mortality table.',
                false
            ),
            ('None of the above', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'The term knocking means',
        'making derogatory remarks about competing underwriters or companies.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_B', 'The term knocking means')
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'promising to pay to two annuitants a fixed annual income as long as both survive.',
                false
            ),
            (
                'making derogatory remarks about competing underwriters or companies.',
                true
            ),
            (
                'the number of years that person at a given age will live on the average as shown by the mortality table.',
                false
            ),
            ('None of the above', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The following are unethical practices in the solicitation and procurement of insurance except'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'misleading estimates of the dividends or shares of surplus to be received thereon.',
                false
            ),
            (
                'inducing a policyholder to lapse, forfeit or surrender a policy he holds for another company.',
                false
            ),
            (
                'misrepresenting the terms of any policy issued by any insurance company or the benefits or advantages promised thereon.',
                false
            ),
            (
                'obtaining or attempting to obtain a license by fraud or misrepresentation.',
                true
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'The following are unethical practices in the solicitation and procurement of insurance except',
        'obtaining or attempting to obtain a license by fraud or misrepresentation.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The following are unethical practices in the solicitation and procurement of insurance except'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'misleading estimates of the dividends or shares of surplus to be received thereon.',
                false
            ),
            (
                'inducing a policyholder to lapse, forfeit or surrender a policy he holds for another company.',
                false
            ),
            (
                'misrepresenting the terms of any policy issued by any insurance company or the benefits or advantages promised thereon.',
                false
            ),
            (
                'obtaining or attempting to obtain a license by fraud or misrepresentation.',
                true
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_B', 'Twisting is')
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'paying the premium on one policy by surrendering the dividends of another policy.',
                false
            ),
            (
                'the replacement of a policy in one company with another policy in another company.',
                true
            ),
            (
                'an attempt made by an insurance to secure the services of an agent from another company.',
                false
            ),
            (
                'an offense which does not apply to variable concepts.',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Twisting is',
        'the replacement of a policy in one company with another policy in another company.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_B', 'Twisting is')
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'paying the premium on one policy by surrendering the dividends of another policy.',
                false
            ),
            (
                'the replacement of a policy in one company with another policy in another company.',
                true
            ),
            (
                'an attempt made by an insurance to secure the services of an agent from another company.',
                false
            ),
            (
                'an offense which does not apply to variable concepts.',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The misstatement of facts by either of the parties of insurance, whether in writing or orally, preliminary and in reference to making the insurance contract is'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('knocking', false),
            ('overloading', false),
            ('misrepresentation', true),
            ('twisting', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'The misstatement of facts by either of the parties of insurance, whether in writing or orally, preliminary and in reference to making the insurance contract is',
        'misrepresentation'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The misstatement of facts by either of the parties of insurance, whether in writing or orally, preliminary and in reference to making the insurance contract is'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('knocking', false),
            ('overloading', false),
            ('misrepresentation', true),
            ('twisting', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Selling a person more insurance than what is warranted by his sources is called'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('overloading', true),
            ('twisting', false),
            ('rebating', false),
            ('knocking', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Selling a person more insurance than what is warranted by his sources is called',
        'overloading'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Selling a person more insurance than what is warranted by his sources is called'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('overloading', true),
            ('twisting', false),
            ('rebating', false),
            ('knocking', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'An agent is prohibited from doing all of the following except:'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'alter an application without the applicant''s prior written approval.',
                false
            ),
            (
                'convince a prospective client to cancel his policy in one insurance company in order to buy a policy in the insurance company represented by the agent.',
                false
            ),
            (
                'refund some of his commission to his client.',
                false
            ),
            (
                'make complete comparisons of policies he sells and those offered by competing insurance companies.',
                true
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'An agent is prohibited from doing all of the following except:',
        'make complete comparisons of policies he sells and those offered by competing insurance companies.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'An agent is prohibited from doing all of the following except:'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'alter an application without the applicant''s prior written approval.',
                false
            ),
            (
                'convince a prospective client to cancel his policy in one insurance company in order to buy a policy in the insurance company represented by the agent.',
                false
            ),
            (
                'refund some of his commission to his client.',
                false
            ),
            (
                'make complete comparisons of policies he sells and those offered by competing insurance companies.',
                true
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Inducing an insured to lapse or forfeit his insurance'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'is not allowed by the conditions of the contract.',
                false
            ),
            (
                'is always to the advantage of the policyholder.',
                false
            ),
            (
                'is an offense in the great majority of cases.',
                true
            ),
            (
                'is a matter left entirely to the discretion of the agent.',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Inducing an insured to lapse or forfeit his insurance',
        'is an offense in the great majority of cases.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Inducing an insured to lapse or forfeit his insurance'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'is not allowed by the conditions of the contract.',
                false
            ),
            (
                'is always to the advantage of the policyholder.',
                false
            ),
            (
                'is an offense in the great majority of cases.',
                true
            ),
            (
                'is a matter left entirely to the discretion of the agent.',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The suicide clause is in effect for'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('the first 6 months.', false),
            ('the first year.', false),
            ('the first 2 years.', true),
            ('the first 18 months.', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'The suicide clause is in effect for',
        'the first 2 years.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The suicide clause is in effect for'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('the first 6 months.', false),
            ('the first year.', false),
            ('the first 2 years.', true),
            ('the first 18 months.', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The three non-forfeiture values in a permanent policy are'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'cash dividends, bonus additions and extended term insurance.',
                false
            ),
            (
                'cash surrender values, loan value, assignment.',
                false
            ),
            (
                'waiver of premium, reinstatement and the policy loan.',
                false
            ),
            (
                'cash surrender value, paid value, extended term insurance.',
                true
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'The three non-forfeiture values in a permanent policy are',
        'cash surrender value, paid value, extended term insurance.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The three non-forfeiture values in a permanent policy are'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'cash dividends, bonus additions and extended term insurance.',
                false
            ),
            (
                'cash surrender values, loan value, assignment.',
                false
            ),
            (
                'waiver of premium, reinstatement and the policy loan.',
                false
            ),
            (
                'cash surrender value, paid value, extended term insurance.',
                true
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'What are the basic settlement options?'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'cash surrender value, automatic premium loan.',
                false
            ),
            (
                'fixed amount, fixed period, interest, fixed period and for life.',
                true
            ),
            (
                'double indemnity, total disability waiver of premium.',
                false
            ),
            (
                'policy loans, assignment, beneficiary designation.',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'What are the basic settlement options?',
        'fixed amount, fixed period, interest, fixed period and for life.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'What are the basic settlement options?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'cash surrender value, automatic premium loan.',
                false
            ),
            (
                'fixed amount, fixed period, interest, fixed period and for life.',
                true
            ),
            (
                'double indemnity, total disability waiver of premium.',
                false
            ),
            (
                'policy loans, assignment, beneficiary designation.',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'In case of misstatement of age'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'the policy is cancelled and a new one is issued for the correct age.',
                false
            ),
            ('the insured can be changed.', false),
            (
                'the amount of insurance is adjusted to the amount which the premium paid at the correct age would have purchased.',
                true
            ),
            (
                'the policy remains in force and the company cannot contest it.',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'In case of misstatement of age',
        'the amount of insurance is adjusted to the amount which the premium paid at the correct age would have purchased.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'In case of misstatement of age'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'the policy is cancelled and a new one is issued for the correct age.',
                false
            ),
            ('the insured can be changed.', false),
            (
                'the amount of insurance is adjusted to the amount which the premium paid at the correct age would have purchased.',
                true
            ),
            (
                'the policy remains in force and the company cannot contest it.',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Which of the following is a settlement option?'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('policy loan', false),
            ('cash surrender value', false),
            ('extended term insurance option', false),
            ('interest on insurance proceeds', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Which of the following is a settlement option?',
        'interest on insurance proceeds'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Which of the following is a settlement option?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('policy loan', false),
            ('cash surrender value', false),
            ('extended term insurance option', false),
            ('interest on insurance proceeds', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Name the provision in a permanent life insurance policy under which, if the premiums are discontinued, full insurance coverage will be maintained for a specified period.'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('extended term insurance', true),
            ('paid up insurance', false),
            ('paid up additions', false),
            ('life income option', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Name the provision in a permanent life insurance policy under which, if the premiums are discontinued, full insurance coverage will be maintained for a specified period.',
        'extended term insurance'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Name the provision in a permanent life insurance policy under which, if the premiums are discontinued, full insurance coverage will be maintained for a specified period.'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('extended term insurance', true),
            ('paid up insurance', false),
            ('paid up additions', false),
            ('life income option', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Which one of the following is not derived from the non-forfeiture values?'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('cash surrender value', false),
            ('paid up insurance', false),
            ('dividends', true),
            ('extended term insurance', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Which one of the following is not derived from the non-forfeiture values?',
        'dividends'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Which one of the following is not derived from the non-forfeiture values?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('cash surrender value', false),
            ('paid up insurance', false),
            ('dividends', true),
            ('extended term insurance', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Mr. Dela Cruz stated in his application that he was 30 years of age and a policy was issued to him on that basis. When he died twenty years later it was found out that, in fact, he was 34 years of age at the time of his application. In conformity with the Insurance Code, the company'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'paid the amount of insurance payable to his beneficiary reduced in relation to his actual age at the time the contract was signed.',
                true
            ),
            (
                'paid one half of the face value of the policy.',
                false
            ),
            (
                'need not pay the face value of the policy, but refund all premiums paid.',
                false
            ),
            (
                'paid the full face value of the policy without any extra charges.',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Mr. Dela Cruz stated in his application that he was 30 years of age and a policy was issued to him on that basis. When he died twenty years later it was found out that, in fact, he was 34 years of age at the time of his application. In conformity with the Insurance Code, the company',
        'paid the amount of insurance payable to his beneficiary reduced in relation to his actual age at the time the contract was signed.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Mr. Dela Cruz stated in his application that he was 30 years of age and a policy was issued to him on that basis. When he died twenty years later it was found out that, in fact, he was 34 years of age at the time of his application. In conformity with the Insurance Code, the company'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'paid the amount of insurance payable to his beneficiary reduced in relation to his actual age at the time the contract was signed.',
                true
            ),
            (
                'paid one half of the face value of the policy.',
                false
            ),
            (
                'need not pay the face value of the policy, but refund all premiums paid.',
                false
            ),
            (
                'paid the full face value of the policy without any extra charges.',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'In the event that the policyowner elects the paid-up insurance option'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'premiums stop and the policy continues for a full face until age 65.',
                false
            ),
            (
                'premiums cease and protection continues for a reduced amount.',
                true
            ),
            (
                'insurance continues at a reduced amount and with reduced premium.',
                false
            ),
            (
                'the policy will automatically terminate.',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'In the event that the policyowner elects the paid-up insurance option',
        'premiums cease and protection continues for a reduced amount.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'In the event that the policyowner elects the paid-up insurance option'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'premiums stop and the policy continues for a full face until age 65.',
                false
            ),
            (
                'premiums cease and protection continues for a reduced amount.',
                true
            ),
            (
                'insurance continues at a reduced amount and with reduced premium.',
                false
            ),
            (
                'the policy will automatically terminate.',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'If a policyowner commits suicide within one year, what''s the company''s liability?'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('the company is not liable at all.', false),
            (
                'the company would be liable for the payment of the face value of the policy.',
                false
            ),
            (
                'the company would be liable for the payment of the premiums paid by the insured only.',
                true
            ),
            ('none of the above', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'If a policyowner commits suicide within one year, what''s the company''s liability?',
        'the company would be liable for the payment of the premiums paid by the insured only.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'If a policyowner commits suicide within one year, what''s the company''s liability?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('the company is not liable at all.', false),
            (
                'the company would be liable for the payment of the face value of the policy.',
                false
            ),
            (
                'the company would be liable for the payment of the premiums paid by the insured only.',
                true
            ),
            ('none of the above', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Which of the non-forfeiture option gives the largest amount of protection?'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('fully paid insurance', false),
            ('cash surrender value', false),
            ('extended term insurance', true),
            ('all of the above give equal protection', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Which of the non-forfeiture option gives the largest amount of protection?',
        'extended term insurance'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Which of the non-forfeiture option gives the largest amount of protection?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('fully paid insurance', false),
            ('cash surrender value', false),
            ('extended term insurance', true),
            ('all of the above give equal protection', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Any policy which has lapsed can be reinstated subject to normal conditions of proof of insurability within'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('three years', true),
            ('six months', false),
            ('one year', false),
            ('two years', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Any policy which has lapsed can be reinstated subject to normal conditions of proof of insurability within',
        'three years'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Any policy which has lapsed can be reinstated subject to normal conditions of proof of insurability within'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('three years', true),
            ('six months', false),
            ('one year', false),
            ('two years', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Benefits payable under health insurance policies cover'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'accidental death and dismemberment benefits.',
                false
            ),
            ('expense reimbursement benefits.', false),
            ('disability income benefits.', false),
            ('all of the above', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Benefits payable under health insurance policies cover',
        'all of the above'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Benefits payable under health insurance policies cover'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'accidental death and dismemberment benefits.',
                false
            ),
            ('expense reimbursement benefits.', false),
            ('disability income benefits.', false),
            ('all of the above', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'With employer-employee groups, an employee does not fill out a personal application for insurance. Instead he merely fills out.'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('an enrollment card.', true),
            ('a registration card.', false),
            ('a certificate of insurance coverage.', false),
            ('a salary deduction form.', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'With employer-employee groups, an employee does not fill out a personal application for insurance. Instead he merely fills out.',
        'an enrollment card.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'With employer-employee groups, an employee does not fill out a personal application for insurance. Instead he merely fills out.'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('an enrollment card.', true),
            ('a registration card.', false),
            ('a certificate of insurance coverage.', false),
            ('a salary deduction form.', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'In the event an employee leaves the company in which he is a member of its group insurance policy, his group coverage can be changed to an individual policy using the'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('policy exchange facility.', false),
            ('conversion privilege.', true),
            ('change of plan provision.', false),
            ('policy change form.', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'In the event an employee leaves the company in which he is a member of its group insurance policy, his group coverage can be changed to an individual policy using the',
        'conversion privilege.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'In the event an employee leaves the company in which he is a member of its group insurance policy, his group coverage can be changed to an individual policy using the'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('policy exchange facility.', false),
            ('conversion privilege.', true),
            ('change of plan provision.', false),
            ('policy change form.', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'For a contract to be legal and binding'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'parties to the contract must be members of the bar.',
                false
            ),
            (
                'parties to the contract must be legally competent.',
                true
            ),
            (
                'parties to the contract must be above 21.',
                false
            ),
            (
                'parties to the contract must possess blood relationship.',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'For a contract to be legal and binding',
        'parties to the contract must be legally competent.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'For a contract to be legal and binding'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'parties to the contract must be members of the bar.',
                false
            ),
            (
                'parties to the contract must be legally competent.',
                true
            ),
            (
                'parties to the contract must be above 21.',
                false
            ),
            (
                'parties to the contract must possess blood relationship.',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The insurance code specifies that a contract does not take effect unless'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'the policy is delivered to an insured, his assignee or agent, or to a beneficiary.',
                false
            ),
            (
                'payment of the first premium is made to the insurer or its authorized agent.',
                true
            ),
            (
                'no change has taken place in the insurability of the life to be insured between the time the application was completed and the time the policy was delivered.',
                false
            ),
            (
                'the insured has named in the policy no fewer than two beneficiaries.',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'The insurance code specifies that a contract does not take effect unless',
        'payment of the first premium is made to the insurer or its authorized agent.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The insurance code specifies that a contract does not take effect unless'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'the policy is delivered to an insured, his assignee or agent, or to a beneficiary.',
                false
            ),
            (
                'payment of the first premium is made to the insurer or its authorized agent.',
                true
            ),
            (
                'no change has taken place in the insurability of the life to be insured between the time the application was completed and the time the policy was delivered.',
                false
            ),
            (
                'the insured has named in the policy no fewer than two beneficiaries.',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'All of the following would be practicable to become beneficiaries except'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('children by former marriage.', false),
            ('brothers and sisters.', false),
            ('someone who owes you money.', true),
            ('someone to whom you owe money.', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'All of the following would be practicable to become beneficiaries except',
        'someone who owes you money.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'All of the following would be practicable to become beneficiaries except'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('children by former marriage.', false),
            ('brothers and sisters.', false),
            ('someone who owes you money.', true),
            ('someone to whom you owe money.', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Under the law pertaining to life insurance'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'only minor children can be named irrevocable beneficiaries.',
                false
            ),
            (
                'only the wife can be named irrevocable beneficiary.',
                false
            ),
            (
                'only the wife and the children can be named irrevocable beneficiaries.',
                false
            ),
            (
                'any person with insurable interest can be named irrevocable beneficiary.',
                true
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Under the law pertaining to life insurance',
        'any person with insurable interest can be named irrevocable beneficiary.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Under the law pertaining to life insurance'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'only minor children can be named irrevocable beneficiaries.',
                false
            ),
            (
                'only the wife can be named irrevocable beneficiary.',
                false
            ),
            (
                'only the wife and the children can be named irrevocable beneficiaries.',
                false
            ),
            (
                'any person with insurable interest can be named irrevocable beneficiary.',
                true
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'When the proceeds of a life insurance policy are left with the company to earn interest'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('income tax is levied on the proceeds.', false),
            (
                'income tax is levied on the interest earnings of the proceeds.',
                true
            ),
            ('estate tax is levied on the proceeds.', false),
            ('donor''s tax is levied on the proceeds.', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'When the proceeds of a life insurance policy are left with the company to earn interest',
        'income tax is levied on the interest earnings of the proceeds.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'When the proceeds of a life insurance policy are left with the company to earn interest'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('income tax is levied on the proceeds.', false),
            (
                'income tax is levied on the interest earnings of the proceeds.',
                true
            ),
            ('estate tax is levied on the proceeds.', false),
            ('donor''s tax is levied on the proceeds.', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'A person has insurable interest on the life of'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('his child or grandchild.', false),
            (
                'any person upon whom he is wholly or in part dependent on, or from whom he is receiving support or education.',
                false
            ),
            (
                'any person in whom he has pecuniary interest.',
                false
            ),
            ('all of the above', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'A person has insurable interest on the life of',
        'all of the above'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'A person has insurable interest on the life of'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('his child or grandchild.', false),
            (
                'any person upon whom he is wholly or in part dependent on, or from whom he is receiving support or education.',
                false
            ),
            (
                'any person in whom he has pecuniary interest.',
                false
            ),
            ('all of the above', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Anybody can be designated a beneficiary except'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('a creditor.', false),
            ('minors.', false),
            (
                'those expressly prohibited by law to receive donations.',
                true
            ),
            ('all of the above', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Anybody can be designated a beneficiary except',
        'those expressly prohibited by law to receive donations.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Anybody can be designated a beneficiary except'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('a creditor.', false),
            ('minors.', false),
            (
                'those expressly prohibited by law to receive donations.',
                true
            ),
            ('all of the above', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The common practice of most life insurers is that the life insurance goes into force'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'when the application is received by the branch office.',
                false
            ),
            (
                'when the policy is delivered to the applicant.',
                false
            ),
            (
                'in accordance with the legal stipulation of the Insurance Code.',
                false
            ),
            ('when the agent gives a binding receipt.', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'The common practice of most life insurers is that the life insurance goes into force',
        'when the agent gives a binding receipt.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The common practice of most life insurers is that the life insurance goes into force'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'when the application is received by the branch office.',
                false
            ),
            (
                'when the policy is delivered to the applicant.',
                false
            ),
            (
                'in accordance with the legal stipulation of the Insurance Code.',
                false
            ),
            ('when the agent gives a binding receipt.', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'According to insurance law, a common-law spouse cannot be designated a beneficiary'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'since there is no benefit of marriage in the relationship.',
                false
            ),
            (
                'if his/her legal partner is still living and the previous marriage has not been legally dissolved.',
                true
            ),
            (
                'since the common-law relationship is an immoral relationship.',
                false
            ),
            ('all of the above', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'According to insurance law, a common-law spouse cannot be designated a beneficiary',
        'if his/her legal partner is still living and the previous marriage has not been legally dissolved.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'According to insurance law, a common-law spouse cannot be designated a beneficiary'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'since there is no benefit of marriage in the relationship.',
                false
            ),
            (
                'if his/her legal partner is still living and the previous marriage has not been legally dissolved.',
                true
            ),
            (
                'since the common-law relationship is an immoral relationship.',
                false
            ),
            ('all of the above', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Policy reserves are future obligations on the part of'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('the Insurance Commission.', false),
            ('the Insurance Company.', true),
            ('the beneficiary.', false),
            ('the policyowner.', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Policy reserves are future obligations on the part of',
        'the Insurance Company.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Policy reserves are future obligations on the part of'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('the Insurance Commission.', false),
            ('the Insurance Company.', true),
            ('the beneficiary.', false),
            ('the policyowner.', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Which one of the following provisions in a permanent life insurance policy may lapse for non-payment of premium?'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('Guaranteed Insurability', false),
            ('Automatic Premium Loan', true),
            ('Settlement Options', false),
            ('Reinstatement Provision', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Which one of the following provisions in a permanent life insurance policy may lapse for non-payment of premium?',
        'Automatic Premium Loan'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Which one of the following provisions in a permanent life insurance policy may lapse for non-payment of premium?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Guaranteed Insurability', false),
            ('Automatic Premium Loan', true),
            ('Settlement Options', false),
            ('Reinstatement Provision', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'A policyholder may obtain money from the insurance company and still remain insured by'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'surrendering the policy for its cash value.',
                false
            ),
            (
                'discontinuing payment of premium for some period.',
                false
            ),
            ('taking a policy loan.', true),
            ('taking the extended insurance option.', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'A policyholder may obtain money from the insurance company and still remain insured by',
        'taking a policy loan.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'A policyholder may obtain money from the insurance company and still remain insured by'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'surrendering the policy for its cash value.',
                false
            ),
            (
                'discontinuing payment of premium for some period.',
                false
            ),
            ('taking a policy loan.', true),
            ('taking the extended insurance option.', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'When you bought an insurance policy on your wife''s life you were 27 and she was 26, but you stated that you were 26 and she was 27. Five years later your wife died. The insurance company will pay'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('the face amount.', false),
            (
                'the face amount adjusted for misstatement of age.',
                true
            ),
            ('the sum of the premium paid.', false),
            ('slightly less than the face amount.', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'When you bought an insurance policy on your wife''s life you were 27 and she was 26, but you stated that you were 26 and she was 27. Five years later your wife died. The insurance company will pay',
        'the face amount adjusted for misstatement of age.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'When you bought an insurance policy on your wife''s life you were 27 and she was 26, but you stated that you were 26 and she was 27. Five years later your wife died. The insurance company will pay'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('the face amount.', false),
            (
                'the face amount adjusted for misstatement of age.',
                true
            ),
            ('the sum of the premium paid.', false),
            ('slightly less than the face amount.', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'If the policy did not contain the name of a beneficiary, the beneficiary will be'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('the wife.', false),
            ('the children', false),
            ('the insured''s brothers and sisters.', false),
            ('the insured''s estate.', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'If the policy did not contain the name of a beneficiary, the beneficiary will be',
        'the insured''s estate.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'If the policy did not contain the name of a beneficiary, the beneficiary will be'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('the wife.', false),
            ('the children', false),
            ('the insured''s brothers and sisters.', false),
            ('the insured''s estate.', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'If a policyowner whose wife is the irrevocable beneficiary wishes to cash in his policy, he must'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('tell his wife what he is going to do.', false),
            ('first take a loan on the policy.', false),
            (
                'have the check issued in the name of his wife.',
                false
            ),
            ('have the wife''s consent.', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'If a policyowner whose wife is the irrevocable beneficiary wishes to cash in his policy, he must',
        'have the wife''s consent.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'If a policyowner whose wife is the irrevocable beneficiary wishes to cash in his policy, he must'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('tell his wife what he is going to do.', false),
            ('first take a loan on the policy.', false),
            (
                'have the check issued in the name of his wife.',
                false
            ),
            ('have the wife''s consent.', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'If a policy with the accidental death rider becomes paid up'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('the accidental death rider ceases.', true),
            (
                'the face amount of the policy is reduced.',
                false
            ),
            (
                'premiums on the basic policy stop but the rider premium continues.',
                false
            ),
            ('none of the above', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'If a policy with the accidental death rider becomes paid up',
        'the accidental death rider ceases.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'If a policy with the accidental death rider becomes paid up'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('the accidental death rider ceases.', true),
            (
                'the face amount of the policy is reduced.',
                false
            ),
            (
                'premiums on the basic policy stop but the rider premium continues.',
                false
            ),
            ('none of the above', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_B', 'An annuity plan')
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('offers life insurance protection.', false),
            ('offers the waiver of premium benefit.', false),
            ('is the same as an endowment plan.', false),
            ('is a purchase of income.', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'An annuity plan',
        'is a purchase of income.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES ('IIAP', 'IIAP_B', 'An annuity plan')
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('offers life insurance protection.', false),
            ('offers the waiver of premium benefit.', false),
            ('is the same as an endowment plan.', false),
            ('is a purchase of income.', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The person who purchases the annuity plan is called the'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('assignor.', false),
            ('owner.', false),
            ('insured.', false),
            ('annuitant.', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'The person who purchases the annuity plan is called the',
        'annuitant.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The person who purchases the annuity plan is called the'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('assignor.', false),
            ('owner.', false),
            ('insured.', false),
            ('annuitant.', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'All of the following statements regarding a life insurance application are correct except'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('it must be signed by the applicant.', false),
            (
                'usually it will be a part of the policy contract.',
                false
            ),
            (
                'misstatement of material facts could void the policy during the contestable period.',
                false
            ),
            (
                'statements made on the applications are warranties.',
                true
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'All of the following statements regarding a life insurance application are correct except',
        'statements made on the applications are warranties.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'All of the following statements regarding a life insurance application are correct except'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('it must be signed by the applicant.', false),
            (
                'usually it will be a part of the policy contract.',
                false
            ),
            (
                'misstatement of material facts could void the policy during the contestable period.',
                false
            ),
            (
                'statements made on the applications are warranties.',
                true
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Prior to granting a license, the IC requires proof of'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('a clean record of employment.', false),
            ('a reasonable educational background.', false),
            (
                'a prospective agent''s character and reputation.',
                false
            ),
            ('all of the above', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'Prior to granting a license, the IC requires proof of',
        'all of the above'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'Prior to granting a license, the IC requires proof of'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('a clean record of employment.', false),
            ('a reasonable educational background.', false),
            (
                'a prospective agent''s character and reputation.',
                false
            ),
            ('all of the above', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The IC has the power to adjudicate insurance claims against insurance companies for any single claim not exceeding'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('P 1,000,000.00', false),
            ('P 250,000.00', false),
            ('P 100,000.00', false),
            ('P 5,000,000.00', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'The IC has the power to adjudicate insurance claims against insurance companies for any single claim not exceeding',
        'P 5,000,000.00'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The IC has the power to adjudicate insurance claims against insurance companies for any single claim not exceeding'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('P 1,000,000.00', false),
            ('P 250,000.00', false),
            ('P 100,000.00', false),
            ('P 5,000,000.00', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'For life insurance coverage to be valid, insurable interest must exist'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('only at the inception of the policy.', true),
            ('only at the time of the loan.', false),
            (
                'throughout the entire lifetime of the policy.',
                false
            ),
            (
                'both at the time of the policy issue and at the time of the loan but not necessarily throughout the lifetime of the policy.',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'For life insurance coverage to be valid, insurable interest must exist',
        'only at the inception of the policy.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'For life insurance coverage to be valid, insurable interest must exist'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('only at the inception of the policy.', true),
            ('only at the time of the loan.', false),
            (
                'throughout the entire lifetime of the policy.',
                false
            ),
            (
                'both at the time of the policy issue and at the time of the loan but not necessarily throughout the lifetime of the policy.',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'In the case of life insurance, a sale is considered completed if the application is signed and payment of the first premium is made by the applicant. For the sale to be considered completed'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'a medical examination has to be made first.',
                false
            ),
            (
                'payment of the first premium has to be made by the applicant in full or in part, as specified. One of the acceptable methods of settlement is by cash or check in part, with a note for the balance.',
                true
            ),
            (
                'payment of the first premium has to be made in full by a note first.',
                false
            ),
            (
                'the first premium has to be paid for in full and in cash.',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'In the case of life insurance, a sale is considered completed if the application is signed and payment of the first premium is made by the applicant. For the sale to be considered completed',
        'payment of the first premium has to be made by the applicant in full or in part, as specified. One of the acceptable methods of settlement is by cash or check in part, with a note for the balance.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'In the case of life insurance, a sale is considered completed if the application is signed and payment of the first premium is made by the applicant. For the sale to be considered completed'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'a medical examination has to be made first.',
                false
            ),
            (
                'payment of the first premium has to be made by the applicant in full or in part, as specified. One of the acceptable methods of settlement is by cash or check in part, with a note for the balance.',
                true
            ),
            (
                'payment of the first premium has to be made in full by a note first.',
                false
            ),
            (
                'the first premium has to be paid for in full and in cash.',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'An automatic premium loan differs from the other policy loans in that an automatic premium loan'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('need not be repaid by the policyowner.', false),
            (
                'must be repaid during the policy year in which it is granted.',
                false
            ),
            (
                'goes into effect requiring no separate action from the policyowner.',
                true
            ),
            (
                'involves higher interest payments because of the greater cost of administration.',
                false
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'An automatic premium loan differs from the other policy loans in that an automatic premium loan',
        'goes into effect requiring no separate action from the policyowner.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'An automatic premium loan differs from the other policy loans in that an automatic premium loan'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('need not be repaid by the policyowner.', false),
            (
                'must be repaid during the policy year in which it is granted.',
                false
            ),
            (
                'goes into effect requiring no separate action from the policyowner.',
                true
            ),
            (
                'involves higher interest payments because of the greater cost of administration.',
                false
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The typical grace period provision in a life insurance policy obliges the life insurance company to'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'establish a policy loan to cover any premium which the policyowner fails to pay by due date.',
                false
            ),
            (
                'keep the policy in force for the duration of any major disability suffered by the policyowner.',
                false
            ),
            (
                'allow the policyowner a three-month extension beyond the due date to make the late premium payment without penalty.',
                false
            ),
            ('none of the above', true)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'The typical grace period provision in a life insurance policy obliges the life insurance company to',
        'none of the above'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'The typical grace period provision in a life insurance policy obliges the life insurance company to'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'establish a policy loan to cover any premium which the policyowner fails to pay by due date.',
                false
            ),
            (
                'keep the policy in force for the duration of any major disability suffered by the policyowner.',
                false
            ),
            (
                'allow the policyowner a three-month extension beyond the due date to make the late premium payment without penalty.',
                false
            ),
            ('none of the above', true)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'When a policy is assigned absolutely'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES (
                'the assignee acquires all the rights and interests of the original policyholder.',
                true
            ),
            (
                'the original policyholder still can exercise some of the rights.',
                false
            ),
            (
                'the original beneficiary is not changed.',
                false
            ),
            ('none of the above', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'When a policy is assigned absolutely',
        'the assignee acquires all the rights and interests of the original policyholder.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'When a policy is assigned absolutely'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES (
                'the assignee acquires all the rights and interests of the original policyholder.',
                true
            ),
            (
                'the original policyholder still can exercise some of the rights.',
                false
            ),
            (
                'the original beneficiary is not changed.',
                false
            ),
            ('none of the above', false)
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'If policyowner does not pay a premium on the due date, the policy will immediately'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('lapse.', false),
            (
                'be converted to a paid-up policy for a lesser amount.',
                false
            ),
            ('go into automatic premium loan.', false),
            (
                'continue in full force for a period of grace.',
                true
            )
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'If policyowner does not pay a premium on the due date, the policy will immediately',
        'continue in full force for a period of grace.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'If policyowner does not pay a premium on the due date, the policy will immediately'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('lapse.', false),
            (
                'be converted to a paid-up policy for a lesser amount.',
                false
            ),
            ('go into automatic premium loan.', false),
            (
                'continue in full force for a period of grace.',
                true
            )
    ) AS v(text, is_correct);
WITH new_question AS (
    INSERT INTO questions (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'If a loan is taken on a participating policy, dividends for that policy while there is a loan against the policy will be'
        )
    RETURNING id
)
INSERT INTO choices (question_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_question,
    (
        VALUES ('suspended.', false),
            ('paid a reduced rate.', false),
            ('Unaffected.', true),
            ('Increased.', false)
    ) AS v(text, is_correct);
INSERT INTO flashcards (exam_type, category, front, back)
VALUES (
        'IIAP',
        'IIAP_B',
        'If a loan is taken on a participating policy, dividends for that policy while there is a loan against the policy will be',
        'Unaffected.'
    );
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    VALUES (
            'IIAP',
            'IIAP_B',
            'If a loan is taken on a participating policy, dividends for that policy while there is a loan against the policy will be'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('suspended.', false),
            ('paid a reduced rate.', false),
            ('Unaffected.', true),
            ('Increased.', false)
    ) AS v(text, is_correct);
COMMIT;