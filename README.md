# InsurePrep — Insurance Licensing Review

A full-stack exam reviewer for insurance licensing candidates, with a console
for the staff who recruit and follow them. Four exam tracks, each with its own
decks, exam and certificate:

- **VUL** (Variable Universal Life)
- **Traditional Life**
- **IIAP (Set A)**
- **IIAP (Set B)**

Built with Next.js (App Router), PostgreSQL and Auth.js v5.

## Who uses it

Three roles, from one `users.role` column. The word on screen is not the enum:

| Role      | Called        | Lands on     | Does                                              |
| --------- | ------------- | ------------ | ------------------------------------------------- |
| `USER`    | Reviewee      | `/dashboard` | Studies, sits practice exams, earns a certificate |
| `MANAGER` | Field Manager | `/admin`     | Watches their own recruits, sends reminders       |
| `ADMIN`   | Sales Manager | `/admin`     | Watches everybody, invites Field Managers         |

Staff accounts oversee rather than study: the roster only lists `USER` rows, so
a manager working through a deck would build a learner record nobody can see.

## Features

### Studying

- **Flashcards** — front/back recall, rated known or not, with the deck order
  and position saved so a sitting resumes on any device
- **Memorization** — multiple-choice items with instant feedback, the same
  resume behaviour, and a mastery panel that agrees with the dashboard
- **Practice Exams** — a paper dealt once per attempt and kept with it, scored
  per question, reviewable afterwards, with a retake beside the review
- **Glossary** — searchable key terms per track
- **Streaks** — a run of correct answers per track, with a best-ever high-water
  mark and celebrations at 5, 10 and 25
- **Progress** — per-track mastery across flashcards, memorization and practice
  questions, plus a Quick Access panel for recently visited modes

### Gates and rewards

- The practice exam for a track unlocks only once **every** flashcard and
  memorization item on it is mastered. Mastery means answered correctly at
  least once, and never goes back down.
- A single sitting passes at **75%**. A track is cleared after **5** passing
  sittings, at which point its **certificate** is issued.

### Staff console

- **Roster** (`/admin`) — readiness per reviewee, status filters, search,
  per-track practice exam results, and removal behind a typed confirmation
- **Field Managers** (`/admin/field-managers`) — a ranked console of recruiters,
  their intake, and how recently each was active
- **Invitations** — a signup link a reviewee can be handed, or an addressed
  invite emailed to a new Field Manager. Each link works once and expires in
  seven days.
- **Nudges** — a reminder sent to a reviewee's in-app notification bell, from a
  preset or written by hand

### Accounts

- Email and password sign-in, with a **Cloudflare Turnstile** check
- Password reset by emailed link; without a mailer configured the link comes
  back in the response outside production
- Avatar upload with an in-browser cropper

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19
- **Database:** PostgreSQL, hosted on [Railway](https://railway.com)
- **DB Client:** [`pg`](https://node-postgres.com/) — raw SQL, no ORM
- **Auth:** [Auth.js v5](https://authjs.dev/) — Credentials provider, JWT sessions
- **Styling:** Tailwind CSS, [Base UI](https://base-ui.com/) primitives
- **Rate limiting:** Upstash Redis, applied in middleware
- **Mail:** Resend, over its HTTP API
- **Bot check:** Cloudflare Turnstile
- **Tests:** Vitest

## Getting Started

### 1. Install dependencies

    npm install

### 2. Set up environment variables

Create `.env.local`:

    # Required
    DATABASE_URL="postgresql://postgres:<password>@<host>:<port>/railway"
    AUTH_SECRET="your-generated-secret"

    # Required for sign-in: the Turnstile widget refuses to render without a
    # site key, and the server refuses the token without the secret.
    NEXT_PUBLIC_TURNSTILE_SITE_KEY="0x..."
    TURNSTILE_SECRET_KEY="0x..."

    # Optional. Rate limiting. Without these the limiter fails open and every
    # request is allowed through.
    UPSTASH_REDIS_REST_URL="https://....upstash.io"
    UPSTASH_REDIS_REST_TOKEN="..."

    # Optional. Outbound mail, used for Field Manager invitations and password
    # resets. Without both, an invitation is still created and the link is
    # handed back in the dialog to send by hand.
    RESEND_API_KEY="re_..."
    MAIL_FROM="INSURE <invites@yourdomain.com>"

Generate an `AUTH_SECRET`:

    npx auth secret

Leave `APP_URL` unset here. Locally the links a signup invite or a password
reset carries are built from the request, which is what makes them open on the
dev server you are running.

### 3. Run database migrations

`src/migration/` holds the numbered SQL files, applied in order:

    psql "$env:DATABASE_URL" -f src/migration/1.sql
    psql "$env:DATABASE_URL" -f src/migration/2.sql
    ...

> `12.sql` adds enum values that `13.sql` uses, so it has to be committed on its
> own before `13.sql` runs.

> On Windows, if `psql` isn't recognized, add it to your session PATH first:
>
>     $env:Path += ";C:\Program Files\PostgreSQL\18\bin"

Tables added after the original schema — study sessions, streaks, nudges,
recent activity, password reset tokens — are created by an idempotent script
that can be re-run safely:

    npm run migrate

### 4. Run the development server

    npm run dev

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

| Command              | Does                                             |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | Development server                               |
| `npm run build`      | Production build                                 |
| `npm test`           | Vitest, once                                     |
| `npm run test:watch` | Vitest, watching                                 |
| `npm run migrate`    | Idempotent schema top-up (`scripts/migrate.cjs`) |

Two seeding scripts exist for looking at screens that are otherwise a long way
in. Both write real rows the app reads back through its own rules:

    node scripts/seed-vul-mastery.cjs <email> [EXAM_TYPE]
    node scripts/seed-practice-passes.cjs <email> [EXAM_TYPE] [--fresh]

The first masters a track's decks so its practice exam unlocks; the second fills
in the five passing sittings a certificate needs.

## Deployment

Set `APP_URL` in the production environment to the address the app is served at:

    APP_URL="https://insureph.app"

Invitations and password resets are opened from a chat or an inbox, somewhere
other than the machine that made them, so they are built on this address rather
than on the host a request arrived at. On Vercel it may be left out — the
platform's own production domain is used — but setting it pins every link to the
custom domain rather than to the `*.vercel.app` one.

NextAuth is a separate matter: behind a proxy, set `AUTH_URL` to the same
address (or `AUTH_TRUST_HOST=true`) so sign-in callbacks land on the right host.
`AUTH_URL` also serves as the link address when `APP_URL` is absent.

Everything else from `.env.local` belongs in the production environment too.

## Project Structure

    src/
      app/
        (auth)/           → signup, forgot-password, reset-password
        admin/            → staff roster and the Field Manager console
        analytics/        → a reviewee's own progress across tracks
        certificates/     → issued certificates, and one certificate's page
        dashboard/        → track cards, study modes, quick access
        glossary/         → searchable vocabulary
        learningMethods/  → flashCard, memorization, practiceExam
        api/              → route handlers (see below)
      components/ui/      → shared components
      lib/
        auth.ts           → Auth.js setup; auth.config.ts is the edge-safe half
        db.ts             → shared Postgres pool
        mailer.ts         → Resend over fetch
        helper/           → the rules, unit-tested away from the pages
        types/            → shared TypeScript types
        validation/       → zod schemas
      middleware.ts       → auth gate, rate limiting, security headers
      migration/          → numbered SQL migrations

API routes group by what they serve: `flashcards`, `memorization`, `questions`
and `attempts` for studying and sitting exams; `progress`, `streaks`,
`recent-activity` and `nudges` for what a learner has done; `admin` and
`invites` for the console; `auth` and `user` for accounts.

## Notes

- No ORM — every query is raw SQL through `pg`, with hand-written migrations.
- Auth is Auth.js v5, Credentials provider, JWT sessions. No session table.
- The rules live in `src/lib/helper/` rather than in the pages, so eligibility,
  streaks, readiness, resume behaviour and the rest are tested directly. Run
  `npm test`.
- API responses are `no-store`. They are per-learner and behind auth, so caching
  them once served one learner's answers to the next.

## Team

- **Frontend:** Reinwel Tingson, Justin Jan Dalumpines
- **Backend:** Nelson Lago III
