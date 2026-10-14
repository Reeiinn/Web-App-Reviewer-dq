DROP TABLE IF EXISTS vocabulary_terms;
CREATE TABLE vocabulary_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_type exam_type NOT NULL,
    term VARCHAR(255) NOT NULL,
    definition TEXT NOT NULL
);
INSERT INTO vocabulary_terms (exam_type, term, definition)
VALUES (
        'IIAP_B',
        'Face Amount',
        'The basic guaranteed death benefit of a policy — the lump sum paid to beneficiaries upon the insured''s death. Example: If you buy a 1,000,000 policy, the 1,000,000 is the Face Amount.'
    ),
    (
        'TRADITIONAL_LIFE',
        'Supplemental Benefits or Riders',
        'Optional add-ons to a base policy that provide extra protection or living benefits for an additional fee. Example: Adding an Accidental Death Benefit Rider with 1,000,000 coverage to a 1,000,000 policy. If the insured dies in an accident, the payout doubles to 2,000,000.'
    ),
    (
        'VUL',
        'Traditional vs. Variable Universal Life (VUL)',
        'Traditional policies offer fixed and mandatory premiums, guaranteed cash value growth, and stable death benefits, with the insurance company managing the funds. VUL policies allow flexible premiums (within min/max limits) and link cash value growth directly to market investments, so the policyholder chooses the investment funds, payout is not guaranteed, and there is exposure to investment risk and growth potential.'
    ),
    (
        'IIAP_A',
        'Participating vs. Non-Participating',
        'Participating policies share in the insurer''s profits via policy dividends (not guaranteed) — e.g. a policy that gives out Guaranteed Cash Value and Dividends. Non-participating policies do not pay dividends; all values and benefits are strictly fixed in the contract — e.g. Term Insurance, which offers pure protection only for a specific period, with no cash value and no dividends.'
    ),
    (
        'TRADITIONAL_LIFE',
        'Term Insurance vs. Pure Endowment',
        'Term Insurance pays only if the insured dies during the specified period (1-year term, 2-year term, 5-year term, etc.); nothing is paid if the person survives. Pure Endowment pays only if the insured survives to the end of the specified period; nothing is paid if the person dies before then. Both are time-bound contracts. Exam tip: look for the word "specific," "specific period," or "specified time."'
    ),
    (
        'TRADITIONAL_LIFE',
        'Non-Forfeiture Options',
        'Options given to a client who wants to surrender, or is unable to pay/continue, a policy, or who wants to make changes to its financial terms. Reduced Paid-Up Insurance: policy is fully paid, face amount decreases, coverage is for life. Extended Term Insurance: cash value is used to buy term coverage equal to the full original face amount for a set duration. Reduced Face Amount: face amount decreases, client continues to pay, coverage is for life (e.g. from 1M to 500K). Paid-Up Additions: dividends are used to buy additional face amount — this raises coverage, raises premiums due, and affects cash value/loan.'
    ),
    (
        'IIAP_B',
        'Revocable vs. Irrevocable Beneficiaries',
        'A Revocable Beneficiary can be changed by the policy owner at any time without their knowledge or consent — e.g. naming your spouse as beneficiary, then later updating the policy to name your child without needing your spouse''s signature. An Irrevocable Beneficiary has vested rights in the policy; the owner cannot change beneficiaries, assign the policy, or borrow against its cash value without the irrevocable beneficiary''s written consent — e.g. a divorce decree requiring an ex-spouse be named as irrevocable beneficiary, meaning you cannot change beneficiaries or take a policy loan unless they sign off.'
    ),
    (
        'TRADITIONAL_LIFE',
        'Absolute Assignee',
        'A person or entity to whom the policy owner permanently transfers all rights, title, and interest in the insurance policy. Example: transferring complete ownership of a 1,000,000 life insurance policy to a trust for estate planning — the trust becomes the Absolute Assignee, controlling the policy entirely from that point forward. Example: a mother abroad is the third-party owner, her sister is the applicant, and the daughter is insured; once the mother returns to the Philippines, ownership transfers to her from her sister.'
    ),
    (
        'VUL',
        'Actuary',
        'A business professional who deals with the measurement and management of risk and uncertainty. They use mathematics, statistics, and financial theory to study uncertain future events, especially those of concern to insurance and pension programs.'
    ),
    (
        'TRADITIONAL_LIFE',
        'Beneficiary',
        'The person or entity designated to receive the benefits of a life insurance policy, annuity, or trust after the death of the policyholder.'
    );