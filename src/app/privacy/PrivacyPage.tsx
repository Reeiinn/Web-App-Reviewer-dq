import { InfoSection, InfoShell } from "@/components/ui/info-shell";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_LAST_UPDATED,
  LEGAL_SERVICE_NAME,
} from "@/lib/legal";
import { Mail } from "lucide-react";

/**
 * Static prose, so this stays a server component — same reasoning as About
 * and Help.
 *
 * Every category below describes something the app genuinely stores. When a
 * column, a table, or a third-party service is added or dropped, this list is
 * part of that change: a privacy notice that has drifted from the schema is
 * worse than none, because it is read as a promise.
 */

const collected = [
  {
    heading: "Your account",
    body: "The name and email address you give when you register, and the password you choose. The password is stored only as a bcrypt hash — it cannot be read back, by us or by anyone with access to the database, which is why a forgotten password is reset rather than recovered.",
  },
  {
    heading: "Your role and who you report to",
    body: "Whether the account is a reviewee, a Unit Manager, or the Sales Manager, and which manager a reviewee belongs to. This is what decides which screens you land on and whose progress a manager can see.",
  },
  {
    heading: "Your profile photo",
    body: "Optional. If you upload one, it is cropped to a small square in your browser and stored alongside your account record. Removing it from the avatar menu deletes it.",
  },
  {
    heading: "What you study",
    body: "Which flashcards and memorization items you have mastered, the practice questions you have answered and whether you got them right, your practice-exam attempts with each answer and score, your per-track progress percentages, and your study streak.",
  },
  {
    heading: "Your certificates",
    body: "The track a certificate was issued for, the date it was issued, and its certificate number.",
  },
  {
    heading: "When you were last active",
    body: "A timestamp updated when you open the app, so a manager can tell an account that has stalled from one that was never used.",
  },
  {
    heading: "Invitations",
    body: "If you were invited to join as a Unit Manager, the invitation record holds the code, who created it, when it expires, and when it was claimed.",
  },
];

export function PrivacyPage({ signedIn }: { signedIn: boolean }) {
  return (
    <InfoShell
      signedIn={signedIn}
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="What INSURE records about you while you study, who can see it, where it is kept, and what you can ask us to do with it."
    >
      <p className="mt-6 text-sm font-semibold text-muted-foreground">
        Last updated {LEGAL_LAST_UPDATED}
      </p>

      <InfoSection title="Who this covers">
        <p>
          This policy covers {LEGAL_SERVICE_NAME}, the exam reviewer you are
          reading it on, and every account that uses it — reviewees, Field
          Managers, and the Sales Manager alike. It is written to the Data
          Privacy Act of 2012 (Republic Act No. 10173) and the rules issued
          under it by the National Privacy Commission.
        </p>
        <p>
          Writing to{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="font-semibold text-[#8A6D0B] underline underline-offset-2 hover:text-foreground"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>{" "}
          reaches the people who run {LEGAL_SERVICE_NAME} and handle everything
          described here.
        </p>
      </InfoSection>

      <InfoSection title="What we collect">
        <dl className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
          {collected.map((item) => (
            <div key={item.heading} className="p-6">
              <dt className="text-base font-extrabold text-foreground">
                {item.heading}
              </dt>
              <dd className="mt-1.5 text-sm leading-6">{item.body}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4">
          We do not ask for your address, your date of birth, any government or
          licence number, or any payment details, and there is nowhere in the
          app to enter them. Please do not put personal details of that kind
          into a profile photo or a name field.
        </p>
      </InfoSection>

      <InfoSection title="Why we hold it">
        <p>
          Your account details exist so the app can tell who you are and keep
          your progress attached to you between visits. Your study record exists
          so the app can pick up where you left off, work out what is still
          unmastered, decide when a practice exam unlocks, and issue a
          certificate when a track is finished. Your role and manager assignment
          exist so the right screens are shown to the right people.
        </p>
        <p>
          The lawful bases we rely on are the performance of our agreement with
          you — you cannot have an account without an account record — and our
          legitimate interest in running a review programme a manager can
          oversee. Your profile photo is optional and rests on your consent; you
          can withdraw that consent by removing the photo.
        </p>
      </InfoSection>

      <InfoSection title="Who can see your study record">
        <div className="rv-card mt-4 p-6">
          <h3 className="text-lg font-extrabold text-foreground">
            Your manager sees your progress
          </h3>
          <p className="mt-3 text-sm leading-6">
            This is worth stating plainly rather than burying. If you are a
            reviewee, the Unit Manager you are assigned to can see your name,
            your email address, your progress on each track, and when you were
            last active, and can send you a reminder to keep going. The Sales
            Manager can see the same for everyone. Neither can see your password
            — nobody can — and neither can sign in as you.
          </p>
        </div>
        <p className="mt-4">
          Nobody else is shown your record. We do not sell it, rent it, or hand
          it to advertisers, and we do not share it with anyone outside the
          people who run {LEGAL_SERVICE_NAME}, except in the two cases below:
          the services we use to run the app, and a lawful order from an
          authority entitled to make one.
        </p>
      </InfoSection>

      <InfoSection title="Where it is processed">
        <p>
          Running the app means using a few outside services, each of which
          handles data on our instructions and nothing more:
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <span className="font-semibold text-foreground">Railway</span> hosts
            the PostgreSQL database, which is where everything listed above is
            stored.
          </li>
          <li>
            <span className="font-semibold text-foreground">Vercel</span> hosts
            the application itself and serves every page you load. On the live
            site it also runs Vercel Analytics, described below.
          </li>
          <li>
            <span className="font-semibold text-foreground">Resend</span> sends
            outbound mail. It is used only for Unit Manager invitations, and it
            sees the address an invitation is going to.
          </li>
        </ul>
        <p>
          These providers operate servers outside the Philippines, so using{" "}
          {LEGAL_SERVICE_NAME} involves your information being stored and
          processed abroad.
        </p>
      </InfoSection>

      <InfoSection title="Cookies and analytics">
        <p>
          {LEGAL_SERVICE_NAME} sets one cookie that matters: the session cookie
          that keeps you signed in. Without it you would be asked to sign in on
          every screen, so it cannot be switched off while you are using an
          account. Clearing it signs you out.
        </p>
        <p>
          The live site also runs Vercel Analytics, which counts page views and
          general traffic patterns. It does not use advertising cookies, does
          not follow you to other sites, and is not tied to your account.
          Analytics does not run in development at all.
        </p>
      </InfoSection>

      <InfoSection title="How long we keep it">
        <p>
          Your account and its study record are kept for as long as the account
          exists, because that record is the thing the app is for. Ask us to
          close your account and we will delete it along with the progress,
          attempts, streaks, and certificates attached to it — those are removed
          with the account rather than left behind. An unclaimed invitation
          expires on the date it was issued with, and can be deleted before
          then.
        </p>
      </InfoSection>

      <InfoSection title="Your rights">
        <p>
          Under the Data Privacy Act you may ask to be told what we hold about
          you and to be given a copy of it, to have anything inaccurate
          corrected, to object to how we are using it, to have it erased or
          blocked where the law allows, and to have it handed to you in a
          portable form. You may also lodge a complaint with the National
          Privacy Commission if you believe we have mishandled your information.
        </p>
        <p>
          Some of this you can do yourself: your name and photo are editable
          from the avatar menu, and a forgotten password is reset from the
          sign-in screen. For anything else, write to{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="font-semibold text-[#8A6D0B] underline underline-offset-2 hover:text-foreground"
          >
            <Mail
              className="mr-1.5 inline size-4 align-[-2px]"
              aria-hidden="true"
            />
            {LEGAL_CONTACT_EMAIL}
          </a>{" "}
          from the address on your account and say what you want done. We will
          come back to you within a reasonable period, and in any case no later
          than the law requires.
        </p>
      </InfoSection>

      <InfoSection title="How we protect it">
        <p>
          Passwords are hashed with bcrypt and never stored in a readable form.
          Sessions are signed tokens rather than shared secrets. Every screen
          and every data route checks who is asking before it answers, and the
          manager roster applies the same rule to the data it returns as the
          console does to the page. Traffic to the site is encrypted in transit.
        </p>
        <p>
          No system is perfectly secure, and we will not pretend otherwise. If a
          breach ever affects your information, we will notify you and the
          National Privacy Commission as the law requires.
        </p>
      </InfoSection>

      <InfoSection title="Who may use INSURE">
        <p>
          {LEGAL_SERVICE_NAME} is built for adults preparing for insurance
          licensing examinations and is not directed at children. We do not
          knowingly create accounts for anyone under 18. If you believe a minor
          has registered, tell us and we will remove the account.
        </p>
      </InfoSection>

      <InfoSection title="Changes to this policy">
        <p>
          If this policy changes, the date at the top changes with it, and a
          change that materially affects what we do with your information will
          be signalled in the app rather than left for you to notice. The
          version on this page is always the one in force.
        </p>
      </InfoSection>

      <InfoSection title="Related">
        <p>
          The{" "}
          <a
            href="/terms"
            className="font-semibold text-[#8A6D0B] underline underline-offset-2 hover:text-foreground"
          >
            Terms &amp; Conditions
          </a>{" "}
          set out the rules for using {LEGAL_SERVICE_NAME}, and the{" "}
          <a
            href="/help"
            className="font-semibold text-[#8A6D0B] underline underline-offset-2 hover:text-foreground"
          >
            Help page
          </a>{" "}
          answers the practical questions about studying and accounts.
        </p>
      </InfoSection>
    </InfoShell>
  );
}
