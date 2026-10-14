/**
 * The tour each role sees the first time they land on their home screen.
 * `target` matches a `data-tour` attribute somewhere on that screen — the nav,
 * or the page underneath it — rather than naming a component, so the tour and
 * the layout it points at can change independently.
 *
 * Steps run in the order a pair of eyes would find them: the page's own
 * content first, then the nav left to right, then the bell and the account
 * menu on the right of the bar.
 */
export type TourStep = {
  target: string;
  title: string;
  body: string;
};

export const ONBOARDING_TOURS: Partial<
  Record<"USER" | "MANAGER" | "ADMIN", TourStep[]>
> = {
  USER: [
    {
      target: "tour-tracks",
      title: "This is home base",
      body: "Pick VUL, Traditional Life, or IIAP, then start with Flashcards, Memorize, or a Practice Exam.",
    },
    {
      target: "tour-quick",
      title: "Pick up where you left off",
      body: "Quick Access keeps the decks you opened most recently, so you can jump straight back in.",
    },
    {
      target: "tour-glossary",
      title: "Look up any term",
      body: "Every term from your tracks, defined — handy when something mid-deck doesn't click.",
    },
    {
      target: "tour-analytics",
      title: "Watch your progress climb",
      body: "Analytics breaks your scores down by track, so you know exactly what to review next.",
    },
    {
      target: "tour-bell",
      title: "Nudges land here",
      body: "If your manager sends a nudge to keep you on track, it shows up right on this bell.",
    },
    {
      target: "tour-profile",
      title: "Your account lives here",
      body: "Upload a profile photo, collect the certificates you earn, and replay this tour anytime.",
    },
  ],
  ADMIN: [
    {
      target: "tour-roster",
      title: "Every reviewee, one screen",
      body: "See each rep's track, progress, and last activity. Search or filter to zero in fast.",
    },
    {
      target: "tour-nudge",
      title: "Nudge who's falling behind",
      body: "One click sends a reminder straight to their notification bell.",
    },
    {
      target: "tour-field-managers",
      title: "Oversee your Unit Managers",
      body: "Add a new Unit Manager, or review the reps assigned to each one.",
    },
    {
      target: "tour-glossary",
      title: "Glossary's one click away",
      body: "Every term your reviewees study, defined — worth a look before you answer one.",
    },
    {
      target: "tour-profile",
      title: "Your account lives here",
      body: "Upload a profile photo, and replay this tour anytime you need it.",
    },
  ],
  MANAGER: [
    {
      target: "tour-roster",
      title: "Your assigned reviewees",
      body: "Track progress for just the reps on your team — nothing outside your scope.",
    },
    {
      target: "tour-nudge",
      title: "Send a nudge",
      body: "Give a reviewee who's stalled a gentle push, right from the roster.",
    },
    {
      target: "tour-glossary",
      title: "Glossary's one click away",
      body: "Handy when a rep asks about a term you want to double-check first.",
    },
    {
      target: "tour-profile",
      title: "Your account lives here",
      body: "Upload a profile photo, and replay this tour anytime you need it.",
    },
  ],
};
