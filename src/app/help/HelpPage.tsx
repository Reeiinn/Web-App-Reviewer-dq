import { InfoSection, InfoShell } from "@/components/ui/info-shell";
import { LifeBuoy, Lock, Mail } from "lucide-react";

/**
 * Static prose, so this stays a server component — same reasoning as About.
 */

/**
 * TODO: put the real support address here once it exists. Empty is deliberate
 * rather than a placeholder string: an address nobody reads is worse than
 * pointing the reviewee at the manager who can actually act.
 */
const SUPPORT_EMAIL = "";

const faqs = [
  {
    question: "How do I start studying?",
    answer:
      "Pick a track on the dashboard — VUL or Traditional Life — and choose a study mode from it. Flash Cards and Memorization are reached through a track rather than from the top nav, because each one belongs to a specific track.",
  },
  {
    question: "What does 'mastered' mean?",
    answer:
      "A flashcard is mastered once you mark that you knew it; a memorization item is mastered once you answer it correctly. Mastery is per track and per item, and it is what the progress percentages are built from.",
  },
  {
    question: "Why is my practice exam locked?",
    answer:
      "The exam for a track unlocks only when every flashcard and every memorization item on that track is mastered. The lock message names what is still outstanding and how many items are left. If a track has no material loaded yet, it stays locked until content is added.",
  },
  {
    question: "How is my streak counted?",
    answer:
      "Studying on consecutive days keeps the streak alive; a day with no study activity ends it. It is a nudge to keep coming back, not part of your score.",
  },
  {
    question: "I forgot my password.",
    answer:
      "Use the 'Forgot password?' link on the sign-in screen. A reset link is emailed to the address on your account — check your spam folder if it does not arrive within a few minutes.",
  },
  {
    question: "How do I change my profile photo?",
    answer:
      "Open the menu behind your avatar in the top-right corner and choose 'Upload photo'. You can frame the crop before anything is saved.",
  },
  {
    question: "I'm a Field Manager — where are my reviewees?",
    answer:
      "Staff accounts land on the Admin Console instead of a dashboard. Your reviewees, their progress, and the nudge you can send someone who has stalled all live there. Analytics is not shown to staff because it charts your own study, and staff accounts do not study.",
  },
  {
    question: "How do I add a Field Manager?",
    answer:
      "Only the Sales Manager can. From Field Managers in the top nav, invite one by email address. If outbound mail is not configured, the invitation is still created and the link is handed back for you to send by hand.",
  },
];

export function HelpPage({ signedIn }: { signedIn: boolean }) {
  return (
    <InfoShell
      signedIn={signedIn}
      eyebrow="Help"
      title="Help & Support"
      intro="How the study modes work, why something might be locked, and what to do when the app is not behaving. If your answer is not here, the last section says who to ask."
    >
      <InfoSection title="Common questions">
        <dl className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
          {faqs.map((faq) => (
            <div key={faq.question} className="p-6">
              <dt className="text-base font-extrabold text-foreground">
                {faq.question}
              </dt>
              <dd className="mt-1.5 text-sm leading-6">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </InfoSection>

      <InfoSection title="If a screen will not load">
        <p>
          <Lock
            className="mr-2 inline size-4 align-[-2px] text-[#8A6D0B]"
            aria-hidden="true"
          />
          Most blank or bouncing screens come down to the session. Sign out from
          the avatar menu, sign back in, and try again — study screens redirect
          staff accounts away, and the dashboard redirects signed-out visitors to
          the sign-in page, so landing somewhere unexpected usually means you are
          signed in as someone other than you expect.
        </p>
        <p>
          If the page still misbehaves after a fresh sign-in, note what you
          clicked and what you saw, and include that when you get in touch. It is
          the difference between a fix and a guess.
        </p>
      </InfoSection>

      <InfoSection title="Still stuck?">
        <div className="rv-card mt-4 p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#0B2340] text-[#FFD400]">
              <LifeBuoy className="size-4" aria-hidden="true" />
            </span>
            <h3 className="text-lg font-extrabold text-foreground">
              Get in touch
            </h3>
          </div>

          {SUPPORT_EMAIL ? (
            <p className="mt-3 text-sm leading-6">
              Email{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-semibold text-[#8A6D0B] underline underline-offset-2 hover:text-foreground"
              >
                <Mail
                  className="mr-1.5 inline size-4 align-[-2px]"
                  aria-hidden="true"
                />
                {SUPPORT_EMAIL}
              </a>{" "}
              with what you were doing and what happened. Include the track and
              study mode if it is about a specific screen.
            </p>
          ) : (
            <p className="mt-3 text-sm leading-6">
              A support address is being set up and will appear here. In the
              meantime, reach out to your Field Manager — they can see your
              progress and escalate anything the app is getting wrong.
            </p>
          )}
        </div>
      </InfoSection>

      <InfoSection title="New here?">
        <p>
          The{" "}
          <a
            href="/about"
            className="font-semibold text-[#8A6D0B] underline underline-offset-2 hover:text-foreground"
          >
            About page
          </a>{" "}
          explains what INSURE covers, how the two tracks differ, and what the
          progress percentages actually measure.
        </p>
      </InfoSection>
    </InfoShell>
  );
}
