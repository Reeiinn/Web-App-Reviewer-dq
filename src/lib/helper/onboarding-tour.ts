/**
 * The three-stop tour each role sees the first time they land on their home
 * screen. `target` matches a `data-tour` attribute somewhere on that screen —
 * the nav, or the page underneath it — rather than naming a component, so the
 * tour and the layout it points at can change independently.
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
      target: "tour-analytics",
      title: "Watch your progress climb",
      body: "Analytics breaks your scores down by track, so you know exactly what to review next.",
    },
    {
      target: "tour-bell",
      title: "Nudges land here",
      body: "If your manager sends a nudge to keep you on track, it shows up right on this bell.",
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
  ],
};
