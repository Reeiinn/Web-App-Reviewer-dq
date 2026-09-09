import { InfoSection, InfoShell } from "@/components/ui/info-shell";

/**
 * Static prose, so this stays a server component: nothing here needs a hook,
 * and keeping it off the client bundle costs nothing to write.
 */

const studyModes = [
  {
    name: "Flash Cards",
    description:
      "Front-and-back recall cards. You judge whether you knew the answer, and a card counts as mastered once you have.",
  },
  {
    name: "Memorization",
    description:
      "Multiple-choice drills with instant feedback, for the definitions and figures that have to be automatic.",
  },
  {
    name: "Vocabulary",
    description:
      "A searchable glossary of the terms each track expects you to know, filterable by exam type.",
  },
  {
    name: "Practice Exams",
    description:
      "Timed, scored attempts under exam conditions, with a per-question review afterwards.",
  },
];

const roles = [
  {
    name: "Reviewee",
    description:
      "The person studying. Works through the tracks, builds mastery, and sits practice exams.",
  },
  {
    name: "Field Manager",
    description:
      "Oversees a group of reviewees from the console: who is progressing, who has stalled, and a nudge to send when someone needs one.",
  },
  {
    name: "Sales Manager",
    description:
      "Sees the whole organisation, appoints Field Managers by email invitation, and compares how each manager's group is doing.",
  },
];

export function AboutPage({ signedIn }: { signedIn: boolean }) {
  return (
    <InfoShell
      signedIn={signedIn}
      eyebrow="About"
      title="About INSURE"
      intro="INSURE is a licensing review app for insurance agents preparing to sit their exams — a structured way to work through the material, prove you have retained it, and know when you are ready."
    >
      <InfoSection title="What it is for">
        <p>
          Passing a licensing exam is less about time spent reading than about
          being able to recall the right thing under pressure. INSURE turns the
          syllabus into material you actively work through: cards you answer,
          drills you get right or wrong, and exams you sit against the clock.
        </p>
        <p>
          Nothing is marked complete because you scrolled past it. Every
          percentage on your dashboard comes from an answer you gave.
        </p>
      </InfoSection>

      <InfoSection title="Four exam tracks">
        <p>
          Material is organised into four independent tracks, each with its own
          cards, drills, glossary and exams — and its own progress. Studying one
          does not move the others.
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <article className="rv-card p-6">
            <h3 className="text-lg font-extrabold text-foreground">VUL</h3>
            <p className="mt-2 text-sm leading-6">
              Variable Universal Life — the investment-linked track, covering
              separate accounts, fund options and the disclosure rules that come
              with them.
            </p>
          </article>
          <article className="rv-card p-6">
            <h3 className="text-lg font-extrabold text-foreground">
              Traditional Life
            </h3>
            <p className="mt-2 text-sm leading-6">
              The conventional life track — whole life, term and endowment
              products, policy provisions, and underwriting fundamentals.
            </p>
          </article>
          <article className="rv-card p-6">
            <h3 className="text-lg font-extrabold text-foreground">
              IIAP (Set A)
            </h3>
            <p className="mt-2 text-sm leading-6">
              The first IIAP question set — its own deck, glossary and exam, and
              its own certificate once the exam is passed.
            </p>
          </article>
          <article className="rv-card p-6">
            <h3 className="text-lg font-extrabold text-foreground">
              IIAP (Set B)
            </h3>
            <p className="mt-2 text-sm leading-6">
              The second IIAP question set. The same qualification as Set A, but
              tracked separately, so clearing one leaves the other untouched.
            </p>
          </article>
        </div>
      </InfoSection>

      <InfoSection title="Four ways to study">
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {studyModes.map((mode) => (
            <article key={mode.name} className="rv-card p-6">
              <h3 className="text-lg font-extrabold text-foreground">
                {mode.name}
              </h3>
              <p className="mt-2 text-sm leading-6">{mode.description}</p>
            </article>
          ))}
        </div>
      </InfoSection>

      <InfoSection title="How progress works">
        <p>
          Each track carries a mastery percentage built from your flashcards,
          memorization items and practice questions. Analytics charts that over
          time, alongside the study streak you build by showing up on
          consecutive days.
        </p>
        <p>
          The practice exam for a track stays locked until every flashcard and
          every memorization item on that track is mastered — the exam is meant
          to tell you something, which it cannot do if you sit it early. Pass it,
          and a certificate is issued for that track.
        </p>
      </InfoSection>

      <InfoSection title="Who uses it">
        <p>
          Three kinds of account share the app, and each sees a different home
          screen after signing in.
        </p>
        <dl className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
          {roles.map((role) => (
            <div key={role.name} className="p-6">
              <dt className="text-lg font-extrabold text-foreground">
                {role.name}
              </dt>
              <dd className="mt-1.5 text-sm leading-6">{role.description}</dd>
            </div>
          ))}
        </dl>
      </InfoSection>

      <InfoSection title="Questions">
        <p>
          If something is not behaving the way this page describes, the{" "}
          <a
            href="/help"
            className="font-semibold text-[#8A6D0B] underline underline-offset-2 hover:text-foreground"
          >
            Help page
          </a>{" "}
          covers the common cases and how to get in touch.
        </p>
      </InfoSection>
    </InfoShell>
  );
}
