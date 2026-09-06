-- Flashcard and memorization items derived from the practice exam pool
-- Generated in the style of 4.sql; run after migrations 1-8 have been applied.
-- Every insert is guarded, so re-running the file adds nothing twice.
BEGIN;
-- Drop any duplicate card that predates this file, keeping the copy with the
-- most learner progress on it. Progress rows on the discarded copy cascade.
DELETE FROM flashcards
WHERE id IN (
        SELECT id
        FROM (
                SELECT f.id,
                    ROW_NUMBER() OVER (
                        PARTITION BY f.exam_type,
                        f.front
                        ORDER BY (
                                SELECT COUNT(*)
                                FROM flashcard_progress p
                                WHERE p.flashcard_id = f.id
                            ) DESC,
                            f.id
                    ) AS copy
                FROM flashcards f
            ) ranked
        WHERE copy > 1
    );
DELETE FROM memorization
WHERE id IN (
        SELECT id
        FROM (
                SELECT m.id,
                    ROW_NUMBER() OVER (
                        PARTITION BY m.exam_type,
                        m.text
                        ORDER BY (
                                SELECT COUNT(*)
                                FROM memorization_progress p
                                WHERE p.memorization_id = m.id
                            ) DESC,
                            m.id
                    ) AS copy
                FROM memorization m
            ) ranked
        WHERE copy > 1
    );
-- Flashcards
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'A man applied for a Ps. 20,000 whole life policy and paid the full initial premium to the soliciting agent. The agent issued a binding receipt. Under such a receipt, the insurance company',
    'Immediately provides interim insurance that remains in effect until the policy is issued or the application is declined'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'A man applied for a Ps. 20,000 whole life policy and paid the full initial premium to the soliciting agent. The agent issued a binding receipt. Under such a receipt, the insurance company'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'An insurance company generally has the right to rescind a life insurance policy if',
    'Company discovers during the contestable period that the application contains a material statement'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'An insurance company generally has the right to rescind a life insurance policy if'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'A policy where an irrevocable beneficiary has been designated the insured, without the beneficiary''s permission, can',
    'Discontinue premium payments'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'A policy where an irrevocable beneficiary has been designated the insured, without the beneficiary''s permission, can'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'A policy which permits the policyholder to vary the level of premiums, the sum insured and has its cash values dependent upon the investment performance and the level of premium paid is known as policy',
    'Universal life'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'A policy which permits the policyholder to vary the level of premiums, the sum insured and has its cash values dependent upon the investment performance and the level of premium paid is known as policy'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'A yearly renewable term life insurance policy generally specifies that',
    'Premiums shall increase every time the policy is renewed'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'A yearly renewable term life insurance policy generally specifies that'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'Both endowment and term life policies provide that',
    'Insurance protection will be limited to a specified period'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'Both endowment and term life policies provide that'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'In certain situations a company may file interpleader actions with a Court of Law. This remedy is used to',
    'Decide conflicting claims on the same insurance proceeds'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'In certain situations a company may file interpleader actions with a Court of Law. This remedy is used to'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'Indicate which of the following is not a function of an application for life insurance policy.',
    'To give details pertaining to non-forfeiture options'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'Indicate which of the following is not a function of an application for life insurance policy.'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'In the case of renewable term insurance, the policy owner may',
    'Renew the coverage based on a higher premium'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'In the case of renewable term insurance, the policy owner may'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'In the event that a policy owner elects the paid-up insurance option',
    'The premiums cease and protection continues with a reduced amount of coverage'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'In the event that a policy owner elects the paid-up insurance option'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'Life insurance companies make use of the laws of probability in order to',
    'Estimate future death rates among members of a given group'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'Life insurance companies make use of the laws of probability in order to'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'Non-forfeiture provisions are included in whole life and endowment policies to assure the policyowner that certain minimum policy benefits shall remain with him even under certain changed conditions. Non-forfeiture values guarantee to the policyowner that',
    'The face amount of the policy will remain the same even if the insured''s health becomes impaired'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'Non-forfeiture provisions are included in whole life and endowment policies to assure the policyowner that certain minimum policy benefits shall remain with him even under certain changed conditions. Non-forfeiture values guarantee to the policyowner that'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'Notwithstanding various possible legal impediments, if the owner of an endowment at age 65 policy tells you that at maturity of the policy he wants to provide his church with a monthly donation for as long as the church exists, which option do you recommend?',
    'Interest option'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'Notwithstanding various possible legal impediments, if the owner of an endowment at age 65 policy tells you that at maturity of the policy he wants to provide his church with a monthly donation for as long as the church exists, which option do you recommend?'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'Paid-up additions',
    'Affect both cash and loan value of the policy'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'Paid-up additions'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'The company will allow a policy change from a higher premium to a lower premium provided the insured',
    'Presents satisfactory evidence of insurability'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'The company will allow a policy change from a higher premium to a lower premium provided the insured'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'The conservation of a life insurance policy is dependent on all the following except',
    'Pressure selling'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'The conservation of a life insurance policy is dependent on all the following except'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'The extent of medical evidence required is determined by',
    'The age of the applicant and the proposed sum to be insured'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'The extent of medical evidence required is determined by'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'The insured named a primary and secondary revocable beneficiary for Ps. 20,000 policy. Which of the following is correct?',
    'The insured can add a third beneficiary at any time'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'The insured named a primary and secondary revocable beneficiary for Ps. 20,000 policy. Which of the following is correct?'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'The settlement options provision may provide all of the following except:',
    'Proceeds held by the company, with interest payable to the beneficiary on request'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'The settlement options provision may provide all of the following except:'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'True or False: According to the law of large numbers, events which happen seemingly by chance will actually be bound to follow a predictable pattern, if enough such happenings are observed.',
    'True'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'True or False: According to the law of large numbers, events which happen seemingly by chance will actually be bound to follow a predictable pattern, if enough such happenings are observed.'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'True or False: An endowment at age 65 policy with premium payable for a limited period of 20 years pays the full amount after 20 years.',
    'False'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'True or False: An endowment at age 65 policy with premium payable for a limited period of 20 years pays the full amount after 20 years.'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'True or False: A policy is not rendered void by reason of misstatement of the assured''s death.',
    'True'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'True or False: A policy is not rendered void by reason of misstatement of the assured''s death.'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'True or False: A policy is still in force for the full face amount and will remain in force for a further period of four years and 118 days, without the payment of any premiums, has availed of the paid up insurance option.',
    'False'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'True or False: A policy is still in force for the full face amount and will remain in force for a further period of four years and 118 days, without the payment of any premiums, has availed of the paid up insurance option.'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'True or False: In a case where the premium has not been paid and the cash values has been exhausted, the policy can still avail of the grace period.',
    'False'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'True or False: In a case where the premium has not been paid and the cash values has been exhausted, the policy can still avail of the grace period.'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'True or False: In most life insurance applications, the largest amount of information requested is data which identifies the applicant.',
    'False'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'True or False: In most life insurance applications, the largest amount of information requested is data which identifies the applicant.'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'Which of the following does not have a legitimate insurable interest?',
    'An individual on the life of his mistress'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'Which of the following does not have a legitimate insurable interest?'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'Which of the following is the least important reason for requiring that insurance agents be licensed?',
    'To provide additional income to the government through license fees'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'Which of the following is the least important reason for requiring that insurance agents be licensed?'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'Which of the following statement is false?',
    'Because of its very short duration the cash value of a yearly renewable term policy grows very fast'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'Which of the following statement is false?'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'Which of the following statements about "Disability Waiver of Premium Rider" is false?',
    'The insured has to die while disabled'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'Which of the following statements about "Disability Waiver of Premium Rider" is false?'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'TRADITIONAL_LIFE',
    'General',
    'Which of the following statements regarding insurance premiums is false?',
    'Cash is required for all premiums paid in the grace period'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'TRADITIONAL_LIFE'
          AND front = 'Which of the following statements regarding insurance premiums is false?'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Diversification in investment involves ___________:',
    'Reducing the risks of investment by putting one fund under management into several categories of investment'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Diversification in investment involves ___________:'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'In risk-return profile of cash funds, bond funds, balanced funds, managed funds and equity funds, a risk-return graph will show that ___________ I. Higher return normally comes with lower risk II. Higher return normally comes with higher risk III. At the top end of the graph are the equity funds IV. The relatively risk-less cash funds sit at the bottom end of the graph',
    'II, III, & IV'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'In risk-return profile of cash funds, bond funds, balanced funds, managed funds and equity funds, a risk-return graph will show that ___________ I. Higher return normally comes with lower risk II. Higher return normally comes with higher risk III. At the top end of the graph are the equity funds IV. The relatively risk-less cash funds sit at the bottom end of the graph'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Investing in bonds offer the following EXCEPT',
    'It enables the investor an opportunity for capital appreciation'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Investing in bonds offer the following EXCEPT'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Policy fee payable by variable life insurance policy owner is to cover ___________',
    'The administrative expenses of setting up the variable life insurance policy'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Policy fee payable by variable life insurance policy owner is to cover ___________'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Rank the following in terms of their liquidity, from the least liquid to the most liquid: I. Short term securities II. Property III. Cash IV. Equities',
    'II, I, IV, III'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Rank the following in terms of their liquidity, from the least liquid to the most liquid: I. Short term securities II. Property III. Cash IV. Equities'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Rank the following investment instruments in terms of their level of risks, from the least risky to the most risky. I. cash and deposit II. derivatives III. a well diversified investment portfolio of a company IV. stock options',
    'I, IV, III & II'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Rank the following investment instruments in terms of their level of risks, from the least risky to the most risky. I. cash and deposit II. derivatives III. a well diversified investment portfolio of a company IV. stock options'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Risk can be classified into two particular categories in relation to investment. They include ___________: I. The risk of not losing some or all of the person''s initial investment II. The risk of rate of return on the investment not matching up to the individual''s expectation III. The risk of rate of return on the investment matching up to the individual''s expectation IV. The risk of losing some or all of a person''s initial investment',
    'II & IV'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Risk can be classified into two particular categories in relation to investment. They include ___________: I. The risk of not losing some or all of the person''s initial investment II. The risk of rate of return on the investment not matching up to the individual''s expectation III. The risk of rate of return on the investment matching up to the individual''s expectation IV. The risk of losing some or all of a person''s initial investment'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Single premium variable life insurance policy:',
    'Must be issued with a minimum death benefit'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Single premium variable life insurance policy:'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'The benefits of investing in variable life funds include ___________. I. Policy owners have access to pooled or diversified portfolios of investment II. Policy owners can easily change the level of the premium payments as the product design of variable life policies have clear structures which cater separately for investment and insurance protection III. Policy owners can gain access to variable life funds managed by professional investment managers with proven track records IV. Policy owners can buy a variable life insurance policy only with a high initial investment',
    'I, II & III'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'The benefits of investing in variable life funds include ___________. I. Policy owners have access to pooled or diversified portfolios of investment II. Policy owners can easily change the level of the premium payments as the product design of variable life policies have clear structures which cater separately for investment and insurance protection III. Policy owners can gain access to variable life funds managed by professional investment managers with proven track records IV. Policy owners can buy a variable life insurance policy only with a high initial investment'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'The flexibility benefit of investing in variable life funds include ___________: I. Policy owners can easily change the level of sum assured and switch their investment between funds II. Policy owners can easily take premium holidays and add single premium to Top-ups III. Variable life insurance policies offer the potential for higher returns IV. Traditional participating policies aim to produce a steady return by smoothing out market fluctuation',
    'I, II & III'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'The flexibility benefit of investing in variable life funds include ___________: I. Policy owners can easily change the level of sum assured and switch their investment between funds II. Policy owners can easily take premium holidays and add single premium to Top-ups III. Variable life insurance policies offer the potential for higher returns IV. Traditional participating policies aim to produce a steady return by smoothing out market fluctuation'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'The fundamental differences between traditional participating life insurance policies and variable life insurance policies include ___________. I. Variable life insurance policies are less likely to offer more choices in terms of the type of investment funds II. The investment elements of variable life insurance policies is made known to the policy owner at the outset and is invested in a separately identifiable fund which is made up of units of investment III. Variable life insurance policies offer the potential for higher returns IV. Traditional participating policies aim to produce a steady return by smoothing out market fluctuation',
    'II, III, IV'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'The fundamental differences between traditional participating life insurance policies and variable life insurance policies include ___________. I. Variable life insurance policies are less likely to offer more choices in terms of the type of investment funds II. The investment elements of variable life insurance policies is made known to the policy owner at the outset and is invested in a separately identifiable fund which is made up of units of investment III. Variable life insurance policies offer the potential for higher returns IV. Traditional participating policies aim to produce a steady return by smoothing out market fluctuation'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'The investment returns under variable life insurance policy ___________. I. Are not guaranteed II. Are assured III. Are linked to the performance of the investment fund managed by the life insurance company IV. Fluctuate according to the rise and fall of market prices',
    'I, III and IV'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'The investment returns under variable life insurance policy ___________. I. Are not guaranteed II. Are assured III. Are linked to the performance of the investment fund managed by the life insurance company IV. Fluctuate according to the rise and fall of market prices'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'The objective of satisfying customers need profitably can be achieved by an agent through I. The giving of freebies to the customers II. Extensive investment training by the company III. The use of sales plan, where sales goals, strategies, and objectives are coordinated with the market analysis, segmentation and training IV. The giving of monetary assistance and discount to the customers',
    'II & III'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'The objective of satisfying customers need profitably can be achieved by an agent through I. The giving of freebies to the customers II. Extensive investment training by the company III. The use of sales plan, where sales goals, strategies, and objectives are coordinated with the market analysis, segmentation and training IV. The giving of monetary assistance and discount to the customers'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'The selling price under a variable life insurance policy is:',
    'The price at which units under the policy are offered for sale by the life company'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'The selling price under a variable life insurance policy is:'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'The switching facility under variable life insurance policies is a very useful ___________',
    'For the purpose of financial planning by the policy owners'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'The switching facility under variable life insurance policies is a very useful ___________'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Variable life funds can be invested in any financial instruments including cash funds, bond funds, equity funds, property funds, specialized funds, and diversified funds. Equity funds ___________:',
    'Invest in shares of stocks and investors who buy such assets usually aim for capital appreciation'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Variable life funds can be invested in any financial instruments including cash funds, bond funds, equity funds, property funds, specialized funds, and diversified funds. Equity funds ___________:'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Variable life insurance policy owners may make withdrawals in terms of ___________.',
    'Number of units through cancellation of units'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Variable life insurance policy owners may make withdrawals in terms of ___________.'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'What are the advantages of investing in preferred shares? I. It gives shareholders the right to a fixed dividend II. Has the priority over company assets during a dissolution III. They enjoy benefit of capital appreciation',
    'I, II, & III'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'What are the advantages of investing in preferred shares? I. It gives shareholders the right to a fixed dividend II. Has the priority over company assets during a dissolution III. They enjoy benefit of capital appreciation'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'What are the benefits available when investing in variable life funds? I. The variable life funds offer policyholders an access to pooled or diversified portfolios II. The variable life policyholders can vary his premium payments, take premium holidays, add single premium top-ups and change the level of the sum assured easily III. The variable life policyholder can have access to a pool of qualified and trained professional fund managers',
    'I, II & III'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'What are the benefits available when investing in variable life funds? I. The variable life funds offer policyholders an access to pooled or diversified portfolios II. The variable life policyholders can vary his premium payments, take premium holidays, add single premium top-ups and change the level of the sum assured easily III. The variable life policyholder can have access to a pool of qualified and trained professional fund managers'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'What are the disadvantages of investing in common shares? I. Dividends are paid more than fixed rates II. Investors are exposed to market and specific risks III. Shares can become worthless if company becomes insolvent',
    'II & III'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'What are the disadvantages of investing in common shares? I. Dividends are paid more than fixed rates II. Investors are exposed to market and specific risks III. Shares can become worthless if company becomes insolvent'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Which of the following BEST describes the policy benefits of variable life policies?',
    'The policy benefits are directly linked to the investment performance of the underlying assets'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Which of the following BEST describes the policy benefits of variable life policies?'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Which of the following factors contribute to the specific risk of an investment: I. Rate of corporate taxes II. Fraud by senior management III. Financial leverage of the company',
    'II and III'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Which of the following factors contribute to the specific risk of an investment: I. Rate of corporate taxes II. Fraud by senior management III. Financial leverage of the company'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Which of the following information is NOT required to be disclosed to policyholders of variable life policies?',
    'The net withdrawal value as of the statement date.'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Which of the following information is NOT required to be disclosed to policyholders of variable life policies?'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Which of the following is / are the main characteristic(s) of variable life policies? I. The policies can be used for investment, as a source of regular savings and protection II. The withdrawal values and protection benefits are determined by the investment III. The net cash values of the policies are the gross cash values shown in the policy that includes dividends up to the date of surrender less and indebtedness including interest',
    'I, & II'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Which of the following is / are the main characteristic(s) of variable life policies? I. The policies can be used for investment, as a source of regular savings and protection II. The withdrawal values and protection benefits are determined by the investment III. The net cash values of the policies are the gross cash values shown in the policy that includes dividends up to the date of surrender less and indebtedness including interest'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Which of the following statements about benefits in variable life fund is FALSE?',
    'The fund ensures definite high yield for an investor since it is managed by professionals who are well-versed in the management of risk of investment portfolios'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Which of the following statements about benefits in variable life fund is FALSE?'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Which of the following statements about characteristics of variable life policies are TRUE? I. Variable policies generally have a longer exposure to equity investment than with participating and other traditional policies II. The protection costs are generally met by implicit charges, which vary with age and level of cover III. The commissions and company expenses are met by a variety of explicit charges, some of which are variable',
    'I & III'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Which of the following statements about characteristics of variable life policies are TRUE? I. Variable policies generally have a longer exposure to equity investment than with participating and other traditional policies II. The protection costs are generally met by implicit charges, which vary with age and level of cover III. The commissions and company expenses are met by a variety of explicit charges, some of which are variable'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Which of the following statements about flexibility features of variable life policies is false?',
    'Policyholders can take loans against their variable life up to the entire withdrawal value of their policies'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Which of the following statements about flexibility features of variable life policies is false?'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Which of the following statements about investment objectives is false?',
    'People invest money in fixed deposits to produce high and guaranteed returns'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Which of the following statements about investment objectives is false?'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Which of the following statements about option top-up under variable life insurance is false?',
    'Policy owners may buy additional units of the variable life fund and these units will be allocated to new variable life insurance policies'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Which of the following statements about option top-up under variable life insurance is false?'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Which of the following statements about single premium variable life policies are TRUE? I. There is no fixed term in a single premium variable life policy and therefore, they are technically whole life insurance II. Top-ups or single premium injections are allowed in these plans III. Policyholders have the flexibility of varying the level cover',
    'I, II & III'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Which of the following statements about single premium variable life policies are TRUE? I. There is no fixed term in a single premium variable life policy and therefore, they are technically whole life insurance II. Top-ups or single premium injections are allowed in these plans III. Policyholders have the flexibility of varying the level cover'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Which of the following statements about variable life policies is TRUE? I. Offer price is used to determine the number of units to be credited to the account II. The margin between the bid and offer price is used to cover the managements cost of the policy III. The policy value is calculated based on the bid price of units allocated into the policy',
    'II & III'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Which of the following statements about variable life policies is TRUE? I. Offer price is used to determine the number of units to be credited to the account II. The margin between the bid and offer price is used to cover the managements cost of the policy III. The policy value is calculated based on the bid price of units allocated into the policy'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Which of the following statements are TRUE? I. The policy value of variable life policies is determined by the offer price at the time of valuation. II. The policy value of endowment policies is the cash value plus any accumulated dividends less any outstanding loans due at the time of surrender. III. The life company needs to maintain a separate account for variable life policies distinct from the general account.',
    'II & III'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Which of the following statements are TRUE? I. The policy value of variable life policies is determined by the offer price at the time of valuation. II. The policy value of endowment policies is the cash value plus any accumulated dividends less any outstanding loans due at the time of surrender. III. The life company needs to maintain a separate account for variable life policies distinct from the general account.'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Which of the following statements is FALSE?',
    'Misrepresentation is a specific form of twisting'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Which of the following statements is FALSE?'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Which of the following statements is TRUE? I. The policy value of variable life policies is determined by the offer price at the time of valuation II. The policy value of endowment policies is the cash value plus any accumulated dividends less any outstanding loans due at the time of the surrender III. The life company needs to maintain a separate account for variable life policies distinct from the general account',
    'II & III'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Which of the following statements is TRUE? I. The policy value of variable life policies is determined by the offer price at the time of valuation II. The policy value of endowment policies is the cash value plus any accumulated dividends less any outstanding loans due at the time of the surrender III. The life company needs to maintain a separate account for variable life policies distinct from the general account'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Which of the statements is true about CASH?',
    'Amount invested in cash depends on size of the cash flow requirement'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Which of the statements is true about CASH?'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Which one of the following statements is FALSE?',
    'Variable life insurance policies offer investors policies with values and indirectly linked to the investment performance of the life company'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Which one of the following statements is FALSE?'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'Why is it important that the customer must understand the sales proposal in full?',
    'Because the impact of changes in investment condition on variable life policy is borne solely by the customer.'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'Why is it important that the customer must understand the sales proposal in full?'
    );
INSERT INTO flashcards (exam_type, category, front, back)
SELECT 'VUL',
    'General',
    'With traditional participating life insurance products, the allocations to policy owners in the form of dividends ___________: I. Are not directly linked to the company''s investment performance II. Have already been smoothened by the life company III. Do not have the highs and lows of investment return as in good investments years of life company IV. Are not fixed at the inception of the policy, but are greatly dependent on the investment performance of the company.',
    'I, II, & III'
WHERE NOT EXISTS (
        SELECT 1
        FROM flashcards
        WHERE exam_type = 'VUL'
          AND front = 'With traditional participating life insurance products, the allocations to policy owners in the form of dividends ___________: I. Are not directly linked to the company''s investment performance II. Have already been smoothened by the life company III. Do not have the highs and lows of investment return as in good investments years of life company IV. Are not fixed at the inception of the policy, but are greatly dependent on the investment performance of the company.'
    );
-- Memorization + choices
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'A father has his present life insurance payable to his estate and because he has now retired he wants to pass the policy on to his son who will assume the premium payments. Which of the following will he have to appoint his son to achieve his desire and protect the son from Estate Tax Liability?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'A father has his present life insurance payable to his estate and because he has now retired he wants to pass the policy on to his son who will assume the premium payments. Which of the following will he have to appoint his son to achieve his desire and protect the son from Estate Tax Liability?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Irrevocable primary beneficiary', false),
            ('Absolute assignee', true),
            ('Irrevocable secondary beneficiary', false),
            ('Revocable primary beneficiary', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'All of the following are sources of information to an insurance company pertaining to the insurability of an applicant except'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'All of the following are sources of information to an insurance company pertaining to the insurability of an applicant except'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('The applicant''s personal appearance', false),
            ('Medical examination report', false),
            ('Agent''s inspection report', false),
            ('Government tax records', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'An agent who determines a prospect''s complete financial requirements preparatory to offering him a policy using the correct selling approach is known as'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'An agent who determines a prospect''s complete financial requirements preparatory to offering him a policy using the correct selling approach is known as'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Counselor selling', false),
            ('Total needs selling', true),
            ('Planned selling', false),
            ('Multiple products selling', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'An insurance company generally has the right to rescind a life insurance policy if'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'An insurance company generally has the right to rescind a life insurance policy if'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Company discovers at any time that the policy owner was actually a minor at the time of application', false),
            ('Insured person intentionally kills himself during the suicide exclusion period specified in the policy', false),
            ('Insured person is killed in military action during the contestable period of the policy', false),
            ('Company discovers during the contestable period that the application contains a material statement', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'A policy where an irrevocable beneficiary has been designated the insured, without the beneficiary''s permission, can'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'A policy where an irrevocable beneficiary has been designated the insured, without the beneficiary''s permission, can'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Avail of a non-forfeiture option', false),
            ('Discontinue premium payments', true),
            ('Borrow minimal cash loan', false),
            ('Alter the dividend option now in effect', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'A policy which permits the policyholder to vary the level of premiums, the sum insured and has its cash values dependent upon the investment performance and the level of premium paid is known as policy'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'A policy which permits the policyholder to vary the level of premiums, the sum insured and has its cash values dependent upon the investment performance and the level of premium paid is known as policy'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Participating whole life policy', false),
            ('Participating endowment', false),
            ('Universal life', true),
            ('None of the above', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'If the interest on a policy loan is not paid at the policy anniversary the insurance company may'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'If the interest on a policy loan is not paid at the policy anniversary the insurance company may'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Increase the present loan by the interest', true),
            ('Terminate the contract', false),
            ('Refuse to grant future additional loan', false),
            ('Demand full settlement of the loan', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'In certain situations a company may file interpleader actions with a Court of Law. This remedy is used to'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'In certain situations a company may file interpleader actions with a Court of Law. This remedy is used to'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Determine if the cause of the insured''s death was an excluded risk', false),
            ('Decide conflicting claims on the same insurance proceeds', true),
            ('Resolve the question of insurable interest', false),
            ('Recommend the best settlement options for the beneficiary', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'In most life insurance applications, the largest amount of information requested is data which'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'In most life insurance applications, the largest amount of information requested is data which'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Identifies the applicant', false),
            ('Describes the type of insurance applied for', false),
            ('Relates to the insurability of the applicant', true),
            ('Describes the desired benefits and mode of payment', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'In the case of renewable term insurance, the policy owner may'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'In the case of renewable term insurance, the policy owner may'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Renew the coverage based on a higher premium', true),
            ('Change the life insured at renewal date', false),
            ('Renew providing the insurance company agrees to continue coverage', false),
            ('Renew at the same premium for further period of years', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'Name the provision in a permanent life insurance policy under which premiums are discontinued, full insurance will be maintained for a specified period:'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'Name the provision in a permanent life insurance policy under which premiums are discontinued, full insurance will be maintained for a specified period:'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Extended term insurance', true),
            ('Paid-up insurance additions', false),
            ('Life income option pension', false),
            ('Reduced paid-up insurance', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'Non-forfeiture provisions are included in whole life and endowment policies to assure the policyowner that certain minimum policy benefits shall remain with him even under certain changed conditions. Non-forfeiture values guarantee to the policyowner that'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'Non-forfeiture provisions are included in whole life and endowment policies to assure the policyowner that certain minimum policy benefits shall remain with him even under certain changed conditions. Non-forfeiture values guarantee to the policyowner that'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('No death claim will be denied for any misstatement on the application', false),
            ('Any guaranteed policy values will belong to the policy owner even if premium payments are discontinued', false),
            ('The face amount of the policy will remain the same even if the insured''s health becomes impaired', true),
            ('The premium on the policy will remain the same even when another beneficiary is added to the policy', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'Notwithstanding various possible legal impediments, if the owner of an endowment at age 65 policy tells you that at maturity of the policy he wants to provide his church with a monthly donation for as long as the church exists, which option do you recommend?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'Notwithstanding various possible legal impediments, if the owner of an endowment at age 65 policy tells you that at maturity of the policy he wants to provide his church with a monthly donation for as long as the church exists, which option do you recommend?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Fixed income option', false),
            ('Periodic annuity option', false),
            ('Interest option', true),
            ('Life annuity option', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'Purchasing a continuous-premium, whole life policy rather than a limited payment, whole life policy gives the policyowner the advantage of'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'Purchasing a continuous-premium, whole life policy rather than a limited payment, whole life policy gives the policyowner the advantage of'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Concentration of premium payments during the period of highest earnings', false),
            ('Liberal risk selection procedures', false),
            ('More insurance protection for the same annual premiums outlay', true),
            ('More rapid accumulation of cash values', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'The basic coverage provided by life insurance policies may be supplemented by a separate provision that provides coverage for accidental amounts or of a different nature. Collectively these provisions are known as'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'The basic coverage provided by life insurance policies may be supplemented by a separate provision that provides coverage for accidental amounts or of a different nature. Collectively these provisions are known as'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Riders', true),
            ('Deposit privileges', false),
            ('Dividends', false),
            ('Assignment', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'The extent of medical evidence required is determined by'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'The extent of medical evidence required is determined by'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('The age of the applicant and the proposed sum to be insured', true),
            ('Occupation of the applicant', false),
            ('Financial condition of the applicant', false),
            ('Date of the last medical examination', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'The insured named a primary and secondary revocable beneficiary for Ps. 20,000 policy. Which of the following is correct?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'The insured named a primary and secondary revocable beneficiary for Ps. 20,000 policy. Which of the following is correct?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('The designation of a contingent beneficiary is subject to the primary beneficiary''s approval', false),
            ('The insured can add a third beneficiary at any time', true),
            ('Any policy loan assignment will require the primary beneficiary''s signature', false),
            ('Upon the insured''s death the primary and secondary beneficiaries shall each receive Ps. 10,000', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'The settlement options provision may provide all of the following except:'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'The settlement options provision may provide all of the following except:'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Payment of the proceeds for the life of the insured', false),
            ('Payment of the proceeds over a fixed period', false),
            ('Payments of the proceeds in fixed amounts until exhausted', false),
            ('Proceeds held by the company, with interest payable to the beneficiary on request', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'The total life coverage of a permanent basic policy can be greatly increased through the use of'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'The total life coverage of a permanent basic policy can be greatly increased through the use of'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('An accidental death benefit rider', false),
            ('An interim term rider', false),
            ('A supplemental term rider', true),
            ('None of the above', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'True or False: Anti-selection occurs when persons in poor health wish to buy insurance.'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'True or False: Anti-selection occurs when persons in poor health wish to buy insurance.'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('True', true),
            ('False', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'True or False: In a case where the premium has not been paid and the cash values has been exhausted, the policy can still avail of the grace period.'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'True or False: In a case where the premium has not been paid and the cash values has been exhausted, the policy can still avail of the grace period.'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('True', false),
            ('False', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'True or False: In a group insurance it is assumed that every member of the group is insurable, provided that every member of the group is working a minimum number of (usually 50 hours) each week.'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'True or False: In a group insurance it is assumed that every member of the group is insurable, provided that every member of the group is working a minimum number of (usually 50 hours) each week.'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('True', false),
            ('False', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'True or False: In most life insurance applications, the largest amount of information requested is data which identifies the applicant.'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'True or False: In most life insurance applications, the largest amount of information requested is data which identifies the applicant.'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('True', false),
            ('False', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'What are the basic settlement options?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'What are the basic settlement options?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Policy loan, guaranteed insurability', false),
            ('Cash surrender value, automatic premium loan', false),
            ('Fixed amount, fixed period, life income, interest on deposit', true),
            ('Double indemnity, total and permanent disability waiver', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'When you bought an insurance policy on your wife''s life, you were 27 and she was 26, but you stated that you were 26 and she was 27. Five years later your wife died. The insurer will pay'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'When you bought an insurance policy on your wife''s life, you were 27 and she was 26, but you stated that you were 26 and she was 27. Five years later your wife died. The insurer will pay'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Slightly less than the face amount', false),
            ('The face amount', false),
            ('The face amount adjusted for misstatement of age', true),
            ('The sum of the premium paid', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'Which of the following is the least important reason for requiring that insurance agents be licensed?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'Which of the following is the least important reason for requiring that insurance agents be licensed?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('To establish and maintain high professional and ethical standards', false),
            ('To protect the public', false),
            ('To give the government adequate control over the conduct of agents', false),
            ('To provide additional income to the government through license fees', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'Which of the following statement is false?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'Which of the following statement is false?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('The cash value of a whole life policy builds up at a slower rate than for a 20 year endowment', false),
            ('The cash value in a permanent policy is guaranteed by the company', false),
            ('The cash value of an endowment builds up faster than that for a limited pay life policy of the same duration', false),
            ('Because of its very short duration the cash value of a yearly renewable term policy grows very fast', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'Which of the following statements about "Disability Waiver of Premium Rider" is false?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'Which of the following statements about "Disability Waiver of Premium Rider" is false?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Disability must occur before a stated date', false),
            ('The insured has to die while disabled', true),
            ('There is a waiting period', false),
            ('It has to be attached to a life insurance policy', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'TRADITIONAL_LIFE',
        'General',
        'Which of the following statements regarding insurance premiums is false?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'TRADITIONAL_LIFE'
              AND text = 'Which of the following statements regarding insurance premiums is false?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Cash is required for all premiums paid in the grace period', true),
            ('A premium is the legal consideration needed to affectuate a life insurance policy', false),
            ('The grace period is usually 31 days', false),
            ('Premiums which are paid quarterly or semi-annually are higher than those paid annually', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Assuming no movement in the prices and charges / fees are deducted after the single premium has been invested into the account, how much will the policyholder lose if he surrenders the policy now? Bid price = Ps. 13.00; Bid-offer spread = 4%; Single premium = Ps. 450,000; Policy fee = Ps. 1,800; Admin and Mortality charge = 3%. Sum assured is 200% of single premium or the value of the units, whichever is higher.'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Assuming no movement in the prices and charges / fees are deducted after the single premium has been invested into the account, how much will the policyholder lose if he surrenders the policy now? Bid price = Ps. 13.00; Bid-offer spread = 4%; Single premium = Ps. 450,000; Policy fee = Ps. 1,800; Admin and Mortality charge = 3%. Sum assured is 200% of single premium or the value of the units, whichever is higher.'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Ps. 43,400.90', false),
            ('Ps. 33,246.78', true),
            ('Ps. 22,500.00', false),
            ('Ps. 15,299.96', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'A unit trust is ___________.'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'A unit trust is ___________.'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Established by a trust deed which enables a trustee to hold the pool of money and assets in trust in behalf of the investor', true),
            ('A close-end fund and does not have to dispose off if the large number investors sell their shares', false),
            ('One whereby the investor buys units in the trust itself and not share in the company', false),
            ('An organization registered under the SECURITY EXCHANGE COMMISSION (SEC) which usually invests in a wide range of equities and other investment', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Diversification in investment involves ___________:'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Diversification in investment involves ___________:'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Putting all the funds under management into one category of investment', false),
            ('Spreading the risk of investment by not putting the fund into several categories of investment', false),
            ('Reducing the risks of investment by putting one fund under management into several categories of investment', true),
            ('Reducing the risks of investment by putting all one''s eggs in one basket', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'In risk-return profile of cash funds, bond funds, balanced funds, managed funds and equity funds, a risk-return graph will show that ___________ I. Higher return normally comes with lower risk II. Higher return normally comes with higher risk III. At the top end of the graph are the equity funds IV. The relatively risk-less cash funds sit at the bottom end of the graph'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'In risk-return profile of cash funds, bond funds, balanced funds, managed funds and equity funds, a risk-return graph will show that ___________ I. Higher return normally comes with lower risk II. Higher return normally comes with higher risk III. At the top end of the graph are the equity funds IV. The relatively risk-less cash funds sit at the bottom end of the graph'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('I, II, & III', false),
            ('II, III, & IV', true),
            ('I, II & IV', false),
            ('I, III, & IV', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Investing in bonds offers the following advantages EXCEPT'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Investing in bonds offers the following advantages EXCEPT'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('It offers protection to the principal and guaranteed steady stream of income', false),
            ('It is a place of temporary refuge when the investor foresees that the market outlook is uncertain', false),
            ('It allows the investor a chance for capital preservation', false),
            ('It enables the investor an opportunity for capital appreciation', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Policy fee payable by variable life insurance policy owner is to cover ___________'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Policy fee payable by variable life insurance policy owner is to cover ___________'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('The handling charges by professional investment managers', false),
            ('The price of each unit bought under the variable life insurance policy', false),
            ('The mortality costs of the variable life insurance policy', false),
            ('The administrative expenses of setting up the variable life insurance policy', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Rank the following investment instruments in terms of their level of risks, from the least risky to the most risky. I. cash and deposit II. derivatives III. a well diversified investment portfolio of a company IV. stock options'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Rank the following investment instruments in terms of their level of risks, from the least risky to the most risky. I. cash and deposit II. derivatives III. a well diversified investment portfolio of a company IV. stock options'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('I, IV, III & II', true),
            ('I, III, IV & II', false),
            ('I, IV, II, & III', false),
            ('I, II, III & IV', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Risk can be classified into two particular categories in relation to investment. They include ___________: I. The risk of not losing some or all of the person''s initial investment II. The risk of rate of return on the investment not matching up to the individual''s expectation III. The risk of rate of return on the investment matching up to the individual''s expectation IV. The risk of losing some or all of a person''s initial investment'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Risk can be classified into two particular categories in relation to investment. They include ___________: I. The risk of not losing some or all of the person''s initial investment II. The risk of rate of return on the investment not matching up to the individual''s expectation III. The risk of rate of return on the investment matching up to the individual''s expectation IV. The risk of losing some or all of a person''s initial investment'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('I & III', false),
            ('I & II', false),
            ('III & IV', false),
            ('II & IV', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Single premium variable life insurance policy:'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Single premium variable life insurance policy:'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Must be issued with a minimum death benefit', true),
            ('Must be issued with a maximum withdrawal value', false),
            ('Has no death benefit', false),
            ('Has no withdrawal value', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'The benefits of investing in variable life funds include ___________. I. Policy owners have access to pooled or diversified portfolios of investment II. Policy owners can easily change the level of the premium payments as the product design of variable life policies have clear structures which cater separately for investment and insurance protection III. Policy owners can gain access to variable life funds managed by professional investment managers with proven track records IV. Policy owners can buy a variable life insurance policy only with a high initial investment'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'The benefits of investing in variable life funds include ___________. I. Policy owners have access to pooled or diversified portfolios of investment II. Policy owners can easily change the level of the premium payments as the product design of variable life policies have clear structures which cater separately for investment and insurance protection III. Policy owners can gain access to variable life funds managed by professional investment managers with proven track records IV. Policy owners can buy a variable life insurance policy only with a high initial investment'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('I, II & IV', false),
            ('I, III, & IV', false),
            ('I, II & III', true),
            ('II, III & IV', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'The characteristics of a variable life insurance include ___________: I. Its withdrawal value and protection benefits are determined by the investment performance of the underlying assets. II. Its protection costs are generally met by implicit charges III. Its commission and company expenses are met by a variety of explicit charges with normally 6 months notice given by the life companies prior to any change IV. Its withdrawal value is normally the value of units allocated to the policy owner calculated at the bid price'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'The characteristics of a variable life insurance include ___________: I. Its withdrawal value and protection benefits are determined by the investment performance of the underlying assets. II. Its protection costs are generally met by implicit charges III. Its commission and company expenses are met by a variety of explicit charges with normally 6 months notice given by the life companies prior to any change IV. Its withdrawal value is normally the value of units allocated to the policy owner calculated at the bid price'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('I, II & III', false),
            ('II, III & IV', false),
            ('I, II & IV', false),
            ('I, III & IV', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'The duties of the trustee of unit trust do not include:'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'The duties of the trustee of unit trust do not include:'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Managing the portfolio of investment and administering the buying and selling of shares in the unit trust itself', true),
            ('Ensuring that the fund manager adhere to the provision of the trust deeds', false),
            ('Acting generally to protect the unit-holders', false),
            ('Holding the pool of money and assets in trust in behalf of the investors', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'The following statement about surrender value under traditional participating life insurance products are TRUE?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'The following statement about surrender value under traditional participating life insurance products are TRUE?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Cash value is paid when yearly renewable term insurance policy is surrendered', false),
            ('When a participating insurance policy is surrendered, the surrender value is calculated by multiplying the bid price with the number of units', false),
            ('The amount of surrender value is usually higher than the amount under non-participating policies and it varies with the age of the assured, being lower at older ages', true),
            ('In the case of participating policies, the net cash surrender value includes the surrender value of the paid-up addition up to the date of surrender', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'The fundamental differences between traditional participating life insurance policies and variable life insurance policies include ___________. I. Variable life insurance policies are less likely to offer more choices in terms of the type of investment funds II. The investment elements of variable life insurance policies is made known to the policy owner at the outset and is invested in a separately identifiable fund which is made up of units of investment III. Variable life insurance policies offer the potential for higher returns IV. Traditional participating policies aim to produce a steady return by smoothing out market fluctuation'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'The fundamental differences between traditional participating life insurance policies and variable life insurance policies include ___________. I. Variable life insurance policies are less likely to offer more choices in terms of the type of investment funds II. The investment elements of variable life insurance policies is made known to the policy owner at the outset and is invested in a separately identifiable fund which is made up of units of investment III. Variable life insurance policies offer the potential for higher returns IV. Traditional participating policies aim to produce a steady return by smoothing out market fluctuation'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('I, III & IV', false),
            ('II, III, IV', true),
            ('I, II, III', false),
            ('I, II & IV', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'The protection cost under a variable life insurance policy ___________. I. Are met by flat initial charges for regular premium plans II. Are generally covered by cancellation of units in the fund III. Are generally met by explicit charges stipulated openly in the policy terms IV. Vary with age of policy owner and level of cover'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'The protection cost under a variable life insurance policy ___________. I. Are met by flat initial charges for regular premium plans II. Are generally covered by cancellation of units in the fund III. Are generally met by explicit charges stipulated openly in the policy terms IV. Vary with age of policy owner and level of cover'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('I, II, & III', false),
            ('I, II, & IV', false),
            ('I, III & IV', false),
            ('II, III, & IV', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'The selling price under a variable life insurance policy is:'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'The selling price under a variable life insurance policy is:'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('The price at which units under the policy are bought back by the life insurance company', false),
            ('The price at which units under the policy are offered for sale by the life company', true),
            ('Also known as the bid price', false),
            ('A fixed amount throughout the life of the policy', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'The switching facility under variable life insurance policies is a very useful ___________'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'The switching facility under variable life insurance policies is a very useful ___________'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('For the purpose of profit planning by the life policies', false),
            ('For the purpose of assets planning by the trustee', false),
            ('For the purpose of sales planning by the fund managers', false),
            ('For the purpose of financial planning by the policy owners', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Under a regular premium variable whole life plan ___________. I. Premium top-ups and holidays, subject to the company''s administrative rules are usually allowed II. Life protection is the main objective of the plan with investment as the nominal purpose III. Withdrawals after the payment of a few years premium are usually allowed IV. A single premium contribution is made to the policy which uses the premium to purchase units in a variable life fund to provide a certain level of life cover'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Under a regular premium variable whole life plan ___________. I. Premium top-ups and holidays, subject to the company''s administrative rules are usually allowed II. Life protection is the main objective of the plan with investment as the nominal purpose III. Withdrawals after the payment of a few years premium are usually allowed IV. A single premium contribution is made to the policy which uses the premium to purchase units in a variable life fund to provide a certain level of life cover'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('II, III & IV', false),
            ('I, III & IV', false),
            ('I, II, & IV', false),
            ('I, II, & III', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Variable life insurance policy owners may make withdrawals in terms of ___________.'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Variable life insurance policy owners may make withdrawals in terms of ___________.'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Number of units or fixed monetary amount through cancellation of units', false),
            ('Number of units of fixed monetary through reduction of the life cover sum assured', false),
            ('Fixed monetary amount only through reduction of the life cover sum assured', false),
            ('Number of units through cancellation of units', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'What are the benefits available when investing in variable life funds? I. The variable life funds offer policyholders an access to pooled or diversified portfolios II. The variable life policyholders can vary his premium payments, take premium holidays, add single premium top-ups and change the level of the sum assured easily III. The variable life policyholder can have access to a pool of qualified and trained professional fund managers'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'What are the benefits available when investing in variable life funds? I. The variable life funds offer policyholders an access to pooled or diversified portfolios II. The variable life policyholders can vary his premium payments, take premium holidays, add single premium top-ups and change the level of the sum assured easily III. The variable life policyholder can have access to a pool of qualified and trained professional fund managers'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('I & II', false),
            ('I & III', false),
            ('I, II & III', true),
            ('II & III', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'What is the most suitable investment instrument for an investor who is interested in protecting his principal and receiving a steady stream of income?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'What is the most suitable investment instrument for an investor who is interested in protecting his principal and receiving a steady stream of income?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Equities', false),
            ('Warrants', false),
            ('Variable life policies', false),
            ('Fixed income securities', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Which of the following BEST describes the policy benefits of variable life policies?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Which of the following BEST describes the policy benefits of variable life policies?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('The policy benefits are payable only on death or disability', false),
            ('The policy benefits will depend on the long-term performance of the life company.', false),
            ('The policy benefits are directly linked to the investment performance of the underlying assets', true),
            ('The policy benefits are guaranteed', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Which of the following factors contribute to the specific risk of an investment: I. Rate of corporate taxes II. Fraud by senior management III. Financial leverage of the company'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Which of the following factors contribute to the specific risk of an investment: I. Rate of corporate taxes II. Fraud by senior management III. Financial leverage of the company'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('I and II', false),
            ('II and III', true),
            ('I and III', false),
            ('I, II and III', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Which of the following information is NOT required to be disclosed to policyholders of variable life policies?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Which of the following information is NOT required to be disclosed to policyholders of variable life policies?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('The net withdrawal value as of the statement date.', true),
            ('The premiums received and charges levied during the period', false),
            ('The basis and frequency for valuing the assets.', false),
            ('Number and value of units held at the beginning of the period; bought and sold during the period; and held at the end of the period.', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Which of the following is / are the main characteristic(s) of variable life policies? I. The policies can be used for investment, as a source of regular savings and protection II. The withdrawal values and protection benefits are determined by the investment III. The net cash values of the policies are the gross cash values shown in the policy that includes dividends up to the date of surrender less and indebtedness including interest'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Which of the following is / are the main characteristic(s) of variable life policies? I. The policies can be used for investment, as a source of regular savings and protection II. The withdrawal values and protection benefits are determined by the investment III. The net cash values of the policies are the gross cash values shown in the policy that includes dividends up to the date of surrender less and indebtedness including interest'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('II', false),
            ('I', false),
            ('I, II, & III', false),
            ('I, & II', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Which of the following statements about diversification in portfolio management is FALSE?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Which of the following statements about diversification in portfolio management is FALSE?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('A diversified portfolio provides greater security to an investor having to sacrifice return for the portfolio.', false),
            ('Diversification can completely eliminate the risk of investing in stocks in a portfolio.', true),
            ('Diversification can involve purchasing different types of stocks and investing stocks in different countries', false),
            ('Diversification helps to spread the portfolio risk by investing in different categories of investment in a portfolio', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Which of the following statements about flexibility features of variable life policies is false?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Which of the following statements about flexibility features of variable life policies is false?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Policyholders may request for a partial withdrawal of the policy and the withdrawal amount will be met by cashing the units at the bid price.', false),
            ('Policyholders can take loans against their variable life up to the entire withdrawal value of their policies', true),
            ('Policyholders have the flexibility of switching from one fund to another provided it satisfies the company''s switching criteria', false),
            ('Policyholders have the flexibility of increasing or decreasing their premiums for regular premium variable life policies', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Which of the following statements about option top-up under variable life insurance is false?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Which of the following statements about option top-up under variable life insurance is false?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Policy owners may buy additional units of the variable life fund and these units will be allocated to new variable life insurance policies', true),
            ('Further premiums at time of the top-up will be used in full, after deducting charges for top-ups, to purchase additional units of the variable life funds', false),
            ('Top-up policy, the policy owner pays further single premium at the time of the top-up', false),
            ('Policy owners are normally allowed to top-up their policies at any time, subject to a minimum amount', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Which of the following statements about rebating are TRUE? I. Rebating is prohibited under the Insurance Code II. Rebating deals with offering the prospect a special inducement to purchase a policy III. Rebating will enhance the sales performance and uphold the prestige of an agent.'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Which of the following statements about rebating are TRUE? I. Rebating is prohibited under the Insurance Code II. Rebating deals with offering the prospect a special inducement to purchase a policy III. Rebating will enhance the sales performance and uphold the prestige of an agent.'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('I & II', true),
            ('I & III', false),
            ('II & III', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Which of the following statements about single premium variable life policies are TRUE? I. There is no fixed term in a single premium variable life policy and therefore, they are technically whole life insurance II. Top-ups or single premium injections are allowed in these plans III. Policyholders have the flexibility of varying the level cover'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Which of the following statements about single premium variable life policies are TRUE? I. There is no fixed term in a single premium variable life policy and therefore, they are technically whole life insurance II. Top-ups or single premium injections are allowed in these plans III. Policyholders have the flexibility of varying the level cover'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('I, II & III', true),
            ('II & III', false),
            ('I & II', false),
            ('I & III', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Which of the following statements about twisting is FALSE?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Which of the following statements about twisting is FALSE?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Twisting is a special form of misrepresentation', false),
            ('It refers to an agents including a policyholder to discontinue policy with another company without disclosing the disadvantage of doing so', false),
            ('It includes misleading or incomplete comparison of policies', false),
            ('It refers to an agent offering a prospect a special inducement to purchase a policy', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Which of the following statements about variable life policies are TRUE? I. The withdrawal value is not guaranteed II. The volatility of the returns depends on the investment strategy of the fund III. The variable life policyholder has direct control over the investment decisions of the variable life fund'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Which of the following statements about variable life policies are TRUE? I. The withdrawal value is not guaranteed II. The volatility of the returns depends on the investment strategy of the fund III. The variable life policyholder has direct control over the investment decisions of the variable life fund'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('I, II & III', false),
            ('I & II', true),
            ('I & III', false),
            ('II & III', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Which of the following statements about variable life policies is TRUE? I. Offer price is used to determine the number of units to be credited to the account II. The margin between the bid and offer price is used to cover the managements cost of the policy III. The policy value is calculated based on the bid price of units allocated into the policy'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Which of the following statements about variable life policies is TRUE? I. Offer price is used to determine the number of units to be credited to the account II. The margin between the bid and offer price is used to cover the managements cost of the policy III. The policy value is calculated based on the bid price of units allocated into the policy'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('I, II & III', false),
            ('I & II', false),
            ('I & III', false),
            ('II & III', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Which of the following statements BEST describes "variable life" policies?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Which of the following statements BEST describes "variable life" policies?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('It is a fixed premium policy with returns that will not vary with the underlying value of investments.', false),
            ('It is a fixed premium policy with returns that will vary with the underlying value of investments.', false),
            ('It is a flexible premium policy with returns that will not vary with the underlying value of investments.', false),
            ('It is a flexible premium policy with returns that will vary with the underlying value of investments.', true)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Which of the following statements is FALSE?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Which of the following statements is FALSE?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Rebating is to offer a prospect a special inducement to purchase a policy', false),
            ('Twisting is a specific form of misrepresentation', false),
            ('Misrepresentation is a specific form of twisting', true),
            ('Switching is a facility allowing the policyholders to switch to another variable life funds offered by the company', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Which one of the following statements is FALSE?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Which one of the following statements is FALSE?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Variable life insurance policies offer investors policies with values and indirectly linked to the investment performance of the life company', true),
            ('Life company will carry out a valuation of its funds yearly and any surplus may be allocated to participating policyholder as cash dividends', false),
            ('Both Whole Life and Endowment policies can be used as an investment media with benefits that become payable at a future date', false),
            ('The investment element of Variable life policies varies according to underlying assets of the portfolio', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'Why is it important that the customer must understand the sales proposal in full?'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'Why is it important that the customer must understand the sales proposal in full?'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('Because the insurer does not guarantee any return', false),
            ('Because the impact of changes in investment condition on variable life policy is borne solely by the customer.', true),
            ('Because the agent may give the wrong recommendations', false),
            ('Because the policyholder expects higher returns', false)
    ) AS v(text, is_correct);
WITH new_memo AS (
    INSERT INTO memorization (exam_type, category, text)
    SELECT 'VUL',
        'General',
        'With traditional participating life insurance products, the allocations to policy owners in the form of dividends ___________: I. Are not directly linked to the company''s investment performance II. Have already been smoothened by the life company III. Do not have the highs and lows of investment return as in good investments years of life company IV. Are not fixed at the inception of the policy, but are greatly dependent on the investment performance of the company.'
    WHERE NOT EXISTS (
            SELECT 1
            FROM memorization
            WHERE exam_type = 'VUL'
              AND text = 'With traditional participating life insurance products, the allocations to policy owners in the form of dividends ___________: I. Are not directly linked to the company''s investment performance II. Have already been smoothened by the life company III. Do not have the highs and lows of investment return as in good investments years of life company IV. Are not fixed at the inception of the policy, but are greatly dependent on the investment performance of the company.'
        )
    RETURNING id
)
INSERT INTO memorization_choices (memorization_id, text, is_correct)
SELECT id,
    v.text,
    v.is_correct
FROM new_memo,
    (
        VALUES ('I, II, & III', true),
            ('I, II & IV', false),
            ('I, III, & IV', false),
            ('II, III, & IV', false)
    ) AS v(text, is_correct);
COMMIT;
