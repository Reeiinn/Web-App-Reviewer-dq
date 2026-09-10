// The glossary, as its source document has it.
//
// Terms used to be seeded as one paragraph each, which flattened away the
// examples, the comparison table and the question-and-answer pairs that make
// the document worth studying. Each term now carries a short definition plus a
// `details` object holding the parts that were being lost.
//
// Required by scripts/migrate.cjs, which upserts these on `(exam_type, term)`.

module.exports = [
  {
    exam_type: "IIAP_B",
    term: "Face Amount",
    definition:
      "The basic guaranteed death benefit of a policy — the lump sum paid to beneficiaries upon the insured's death.",
    details: {
      examples: [
        { text: "If you buy a 1,000,000 policy, the 1,000,000 is the Face Amount." },
      ],
    },
  },

  {
    exam_type: "TRADITIONAL_LIFE",
    term: "Supplemental Benefits or Riders",
    definition:
      "Optional add-ons to a base policy that provide extra protection or living benefits for an additional fee.",
    details: {
      examples: [
        {
          text: "Adding an Accidental Death Benefit Rider with 1,000,000 coverage to a 1,000,000 policy. If the insured dies in an accident, the payout doubles to 2,000,000.",
        },
      ],
    },
  },

  {
    exam_type: "VUL",
    term: "Traditional vs. Variable Universal Life (VUL)",
    definition:
      "Traditional policies offer fixed premiums, guaranteed cash value growth, and stable death benefits managed entirely by the insurer. VUL policies allow flexible premiums and link cash value growth directly to market investments (like stock index funds), introducing investment risk and growth potential.",
    details: {
      comparison: {
        columns: ["Feature", "Traditional Life", "Variable Universal Life (VUL)"],
        rows: [
          {
            feature: "Premiums",
            values: ["Fixed & mandatory", "Flexible, within minimum/maximum limits"],
          },
          {
            feature: "Investment",
            values: [
              "Handled by the company",
              "Market-driven — invested and exposed in the market (can gain or lose value)",
            ],
          },
          {
            feature: "Control",
            values: [
              "Insurance company manages the funds",
              "Policyholder chooses the investment funds",
            ],
          },
          { feature: "Payout", values: ["Guaranteed cash", "Not guaranteed"] },
        ],
      },
    },
  },

  {
    exam_type: "IIAP_A",
    term: "Participating vs. Non-Participating",
    definition:
      "Participating policies share in the insurer's profits via policy dividends (which are not guaranteed). Non-participating policies do not pay dividends; all values and benefits are strictly fixed in the contract.",
    details: {
      examples: [
        {
          label: "Participating",
          text: "A policy that gives out Guaranteed Cash Value and Dividends.",
        },
        {
          label: "Non-Participating",
          text: "A policy that offers pure protection only, for a specific period, with no cash value and no dividends. Very good example: Term Insurance.",
        },
      ],
    },
  },

  {
    exam_type: "TRADITIONAL_LIFE",
    term: "Term Insurance vs. Pure Endowment",
    definition:
      "Two time-bound contracts that pay on opposite outcomes: Term Insurance on the insured's death within the period, Pure Endowment on the insured's survival to the end of it.",
    details: {
      keyPointsLabel: "Differences",
      keyPoints: [
        {
          text: "Term Insurance pays only if the insured dies during the specified period; nothing is paid if the person survives. (1-year, 2-year, 3-year, 5-year term, etc.)",
        },
        {
          text: "Pure Endowment pays only if the insured survives to the end of the specified period; nothing is paid if the person dies before then.",
        },
      ],
      similarities: ["Both are time-bound contracts."],
    },
  },

  {
    exam_type: "TRADITIONAL_LIFE",
    term: "Non-Forfeiture Options",
    definition:
      "Options given if the client wants to surrender the policy, is not able to pay or continue it, or has any change in the financial part of the policy.",
    details: {
      keyPointsLabel: "The four options",
      keyPoints: [
        {
          text: "Reduced Paid-Up Insurance — Policy is fully paid. Face amount, and so coverage, decreases. Covered for life.",
        },
        {
          text: "Extended Term Insurance — Use cash value to buy term coverage equal to the full original face amount, for a set duration.",
        },
        {
          text: "Reduce Face Amount — Face amount decreases, client continues to pay, covered for life. (From 1M face amount to 500K face amount.)",
        },
        {
          text: "Paid-Up Additions — Dividends are used to buy additional face amount.",
          children: [
            "Will it affect cash value or loan? Yes.",
            "Will it affect the premiums (due) of the client? Yes — it becomes costly.",
            "Will it affect the coverage of the client? Yes — it becomes higher.",
          ],
        },
      ],
    },
  },

  {
    exam_type: "IIAP_B",
    term: "Revocable vs. Irrevocable Beneficiaries",
    definition:
      "A Revocable Beneficiary can be changed by the policy owner at any time, without their knowledge or consent. An Irrevocable Beneficiary has vested rights in the policy: the owner cannot change beneficiaries, assign the policy, or borrow against its cash value without written consent from the irrevocable beneficiary.",
    details: {
      examples: [
        {
          label: "Revocable",
          text: "You name your spouse as beneficiary, but later update the policy to name your child — without needing your spouse's signature.",
        },
        {
          label: "Irrevocable",
          text: "A divorce decree requires naming an ex-spouse as an irrevocable beneficiary. You cannot change beneficiaries or take out a policy loan unless they sign off.",
        },
      ],
    },
  },

  {
    exam_type: "TRADITIONAL_LIFE",
    term: "Absolute Assignee",
    definition:
      "A person or entity to whom the policy owner permanently transfers all rights, title, and interest in the insurance policy.",
    details: {
      examples: [
        {
          text: "You transfer complete ownership of your 1,000,000 life insurance policy to a trust for estate planning. The trust becomes the Absolute Assignee, controlling the policy entirely from that point forward.",
        },
        {
          text: "A family transfer, with ownership moving later:",
          roles: [
            { role: "Third-party owner", who: "Mother (abroad)" },
            { role: "Applicant", who: "Sister of the mother (Tita)" },
            { role: "Insured", who: "Daughter" },
          ],
          note: "Once the mother returns to the Philippines, ownership transfers to her from her sister.",
        },
      ],
    },
  },

  {
    exam_type: "VUL",
    term: "Actuary",
    definition:
      "A business professional who deals with the measurement and management of risk and uncertainty. They use mathematics, statistics, and financial theory to study uncertain future events, especially those of concern to insurance and pension programs.",
    details: null,
  },

  {
    exam_type: "TRADITIONAL_LIFE",
    term: "Beneficiary",
    definition:
      "The person or entity designated to receive the benefits of a life insurance policy, annuity, or trust after the death of the policyholder.",
    details: null,
  },
];
