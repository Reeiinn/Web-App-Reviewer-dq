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
 * The disclaimer section is the one that earns its place here rather than in
 * a generic template: the app issues something it calls a certificate, for
 * exams set by a regulator it has nothing to do with, and a reviewee should
 * not have to guess what that certificate is worth.
 */

export function TermsPage({ signedIn }: { signedIn: boolean }) {
  return (
    <InfoShell
      signedIn={signedIn}
      eyebrow="Terms"
      title="Terms & Conditions"
      intro="The agreement between you and INSURE: who may use it, what you can expect from it, what it does not promise, and the rules that apply while you study."
    >
      <p className="mt-6 text-sm font-semibold text-muted-foreground">
        Last updated {LEGAL_LAST_UPDATED}
      </p>

      <InfoSection title="Agreeing to these terms">
        <p>
          Creating an account or using {LEGAL_SERVICE_NAME} means you accept
          these terms. If you do not accept them, do not create an account and
          do not use the app. If you are using {LEGAL_SERVICE_NAME} because an
          agency or a manager enrolled you, you are still agreeing to them
          yourself.
        </p>
      </InfoSection>

      <InfoSection title="What INSURE is">
        <div className="rv-card mt-4 p-6">
          <h3 className="text-lg font-extrabold text-foreground">
            Read this part first
          </h3>
          <ul className="mt-3 ml-5 list-disc space-y-2 text-sm leading-6">
            <li>
              {LEGAL_SERVICE_NAME} is study material. It is not affiliated with,
              endorsed by, accredited by, or connected in any way to the
              Insurance Commission or any other regulator, examining body, or
              licensing authority.
            </li>
            <li>
              Nothing here guarantees that you will pass an examination. What
              the app measures is how you did on our practice material, which is
              our best effort at useful preparation and is not the real
              examination.
            </li>
            <li>
              An {LEGAL_SERVICE_NAME} certificate records that you completed a
              track inside this app. It is not a licence, not an official
              credential, and confers no right to sell insurance or to represent
              yourself as licensed.
            </li>
            <li>
              Nothing in the app is legal, financial, tax, or professional
              advice, and it should not be relied on as any of those.
            </li>
          </ul>
        </div>
      </InfoSection>

      <InfoSection title="Who may use INSURE">
        <p>
          You must be at least 18 and preparing for, or supporting someone
          preparing for, an insurance licensing examination. Reviewee accounts
          are created by registering. Field Manager accounts exist only by
          invitation from the Sales Manager, and an invitation is for the person
          it was addressed to.
        </p>
      </InfoSection>

      <InfoSection title="Your account">
        <p>
          Give accurate details when you register and keep them current. Your
          account is yours alone: keep the password to yourself, do not let
          anyone else study under your name, and do not sign in as anyone else.
          Anything done through your account is treated as done by you.
        </p>
        <p>
          Tell us at once if you think someone else has got into your account.
          If you have simply forgotten your password, reset it from the sign-in
          screen — we cannot read it back to you, because it is never stored in
          a readable form.
        </p>
      </InfoSection>

      <InfoSection title="Your manager can see how you are doing">
        <p>
          If a Field Manager is assigned to you, they can see your progress on
          each track, when you were last active, and whether you have stalled,
          and they can send you a reminder. The Sales Manager can see the same
          across everyone. This is how the review programme is meant to work,
          and using {LEGAL_SERVICE_NAME} as a reviewee means accepting that
          oversight. The{" "}
          <a
            href="/privacy"
            className="font-semibold text-[#8A6D0B] underline underline-offset-2 hover:text-foreground"
          >
            Privacy Policy
          </a>{" "}
          sets out exactly what is visible.
        </p>
      </InfoSection>

      <InfoSection title="Using the app properly">
        <p>While using {LEGAL_SERVICE_NAME}, do not:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            copy, export, scrape, republish, or resell the questions,
            flashcards, glossary entries, or any other study content;
          </li>
          <li>
            share your account, or use anyone else&apos;s;
          </li>
          <li>
            try to break, probe, overload, or get around the sign-in, the role
            checks, or any other part of the app&apos;s security;
          </li>
          <li>
            automate your way through the study material, or otherwise fake
            progress, mastery, or a certificate;
          </li>
          <li>
            upload anything unlawful, offensive, or belonging to someone else as
            a profile photo or a name;
          </li>
          <li>use the app for anything against Philippine law.</li>
        </ul>
      </InfoSection>

      <InfoSection title="The study content">
        <p>
          The questions, flashcards, memorization items, glossary, artwork, and
          the app itself belong to {LEGAL_SERVICE_NAME} and the people who built
          it, and are protected by copyright. You get a personal,
          non-transferable right to use them to prepare for your own
          examination, and nothing more. That right ends when your account does.
        </p>
        <p>
          We work to keep the material accurate and current, but examinations
          and the rules behind them change. Where our material and the official
          syllabus disagree, the official source governs.
        </p>
      </InfoSection>

      <InfoSection title="Availability and changes">
        <p>
          We aim to keep {LEGAL_SERVICE_NAME} running, but it is offered as it
          is and as it is available. It may be down for maintenance, for a fault
          in a service we depend on, or for reasons outside our control. We may
          add, change, or withdraw features, tracks, or study material, and we
          may change these terms — when we do, the date at the top changes, and
          continuing to use the app means accepting the revised version.
        </p>
      </InfoSection>

      <InfoSection title="Suspension and closing an account">
        <p>
          We may suspend or close an account that breaks these terms, that is
          being used to abuse the app or another person, or that we are required
          to act on by law. Where it is reasonable to do so, we will say why.
        </p>
        <p>
          You may close your account at any time by writing to us. Closing it
          removes your progress, attempts, streaks, and certificates along with
          the account.
        </p>
      </InfoSection>

      <InfoSection title="Liability">
        <p>
          {LEGAL_SERVICE_NAME} is provided without warranties of any kind, to
          the fullest extent the law allows: we do not warrant that the app will
          be uninterrupted or error-free, that the material is complete or free
          of mistakes, or that using it will produce any particular result.
        </p>
        <p>
          To the fullest extent Philippine law allows, we are not liable for
          indirect or consequential loss, for lost income or opportunity, or for
          a failed examination, a lost or delayed licence, or any decision you
          took relying on the app. Nothing here excludes liability that cannot
          lawfully be excluded — including for fraud, or for death or personal
          injury caused by negligence.
        </p>
      </InfoSection>

      <InfoSection title="Governing law">
        <p>
          These terms are governed by the laws of the Republic of the
          Philippines, and any dispute arising from them or from your use of
          {" "}{LEGAL_SERVICE_NAME} is subject to the exclusive jurisdiction of
          the Philippine courts. If any part of these terms turns out to be
          unenforceable, the rest continues to apply.
        </p>
      </InfoSection>

      <InfoSection title="Getting in touch">
        <p>
          Questions about these terms, or a request to close your account, go
          to{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="font-semibold text-[#8A6D0B] underline underline-offset-2 hover:text-foreground"
          >
            <Mail
              className="mr-1.5 inline size-4 align-[-2px]"
              aria-hidden="true"
            />
            {LEGAL_CONTACT_EMAIL}
          </a>
          . For how the app behaves rather than what it permits, the{" "}
          <a
            href="/help"
            className="font-semibold text-[#8A6D0B] underline underline-offset-2 hover:text-foreground"
          >
            Help page
          </a>{" "}
          is quicker.
        </p>
      </InfoSection>
    </InfoShell>
  );
}
