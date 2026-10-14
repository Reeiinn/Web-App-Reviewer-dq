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
| `MANAGER` | Unit Manager  | `/admin`     | Watches their own recruits, sends reminders       |
| `ADMIN`   | Sales Manager | `/admin`     | Watches everybody, invites Unit Managers          |

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
- **Unit Managers** (`/admin/field-managers`) — a ranked console of recruiters,
  their intake, and how recently each was active
- **Invitations** — a signup link a reviewee can be handed, or an addressed
  invite emailed to a new Unit Manager. Each link works once and expires in
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
- **DB Client:** [Prisma](https://www.prisma.io/) 7, on the `pg` driver adapter
- **Auth:** [Auth.js v5](https://authjs.dev/) — Credentials provider, JWT sessions
- **Styling:** Tailwind CSS, [Base UI](https://base-ui.com/) primitives
- **Rate limiting:** Upstash Redis, applied in middleware
- **Mail:** Resend, over its HTTP API
- **Bot check:** Cloudflare Turnstile
- **Tests:** Vitest

## Getting Started

### 1. Install dependencies

    pnpm install

### 2. Set up environment variables

Create `.env.local`:

    # Required. For local work, a local database (see step 3).
    DATABASE_URL="postgresql://postgres:<password>@localhost:5432/insure_dev"

    # Prisma tooling (step 3). Local databases only: the CLI and the tests
    # refuse any other host.
    MIGRATE_DATABASE_URL="postgresql://postgres:<password>@localhost:5432/insure_dev"
    TEST_DATABASE_URL="postgresql://postgres:<password>@localhost:5432/insure"
    SHADOW_DATABASE_URL="postgresql://postgres:<password>@localhost:5432/insure"
    AUTH_SECRET="your-generated-secret"

    # Required for sign-in: the Turnstile widget refuses to render without a
    # site key, and the server refuses the token without the secret.
    NEXT_PUBLIC_TURNSTILE_SITE_KEY="0x..."
    TURNSTILE_SECRET_KEY="0x..."

    # Optional. Rate limiting. Without these the limiter fails open and every
    # request is allowed through.
    UPSTASH_REDIS_REST_URL="https://....upstash.io"
    UPSTASH_REDIS_REST_TOKEN="..."

    # Optional. Outbound mail, used for Unit Manager invitations and password
    # resets. Without both, an invitation is still created and the link is
    # handed back in the dialog to send by hand.
    RESEND_API_KEY="re_..."
    MAIL_FROM="INSURE <invites@yourdomain.com>"

Generate an `AUTH_SECRET`:

    npx auth secret

Leave `APP_URL` unset here. Locally the links a signup invite or a password
reset carries are built from the request, which is what makes them open on the
dev server you are running.

### 3. Set up the database

The schema is managed by [Prisma](https://www.prisma.io/). Migrations live in
`prisma/migrations`; see its README for the rules (additive only, read every
generated line).

Build a local database from the migrations and seed the glossary:

    pnpm migrate
    pnpm exec prisma db seed

`pnpm migrate` runs `prisma migrate deploy` against `MIGRATE_DATABASE_URL`. To
work against real data instead, restore a `pg_dump` of production into the
local database and mark the baseline applied:
`pnpm exec prisma migrate resolve --applied 0_init`.

> On Windows, if `pg_dump` or `psql` isn't recognized, add it to your session
> PATH first:
>
>     $env:Path += ";C:\Program Files\PostgreSQL\18\bin"

The hand-applied SQL files and `migrate.cjs` that came before Prisma are kept
in `src/migration/archive/` for history.

### 4. Run the development server

    pnpm dev

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

| Command              | Does                                             |
| -------------------- | ------------------------------------------------ |
| `pnpm dev`           | Development server                               |
| `pnpm build`         | Production build                                 |
| `pnpm test`          | Unit tests, once                                 |
| `pnpm test:watch`    | Vitest, watching                                 |
| `pnpm test:db`       | Data-layer tests against `TEST_DATABASE_URL` (rebuilt each run) |
| `pnpm migrate`       | Apply pending Prisma migrations to `MIGRATE_DATABASE_URL`; local only unless `ALLOW_REMOTE_MIGRATE=1` |

Two seeding scripts exist for looking at screens that are otherwise a long way
in. Both write real rows the app reads back through its own rules, into
`MIGRATE_DATABASE_URL`, and refuse any database that is not local:

    pnpm seed:mastery <email> [EXAM_TYPE]
    pnpm seed:passes <email> [EXAM_TYPE] [--fresh]

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
        admin/            → staff roster and the Unit Manager console
        analytics/        → a reviewee's own progress across tracks
        certificates/     → issued certificates, and one certificate's page
        dashboard/        → track cards, study modes, quick access
        glossary/         → searchable vocabulary
        learningMethods/  → flashCard, memorization, practiceExam
        api/              → route handlers (see below)
      components/ui/      → shared components
      lib/
        auth.ts           → Auth.js setup; auth.config.ts is the edge-safe half
        mailer.ts         → Resend over fetch
        helper/           → the rules, unit-tested away from the pages
        types/            → shared TypeScript types
        validation/       → zod schemas
      server/
        db/prisma.ts      → the one Prisma client
        data/             → every query, one module per domain
      middleware.ts       → auth gate, rate limiting, security headers
      migration/archive/  → the hand-applied SQL from before Prisma
    prisma/               → schema, migrations, glossary seed
    assets/fonts/         → the faces the certificate PNG is rendered in
    public/certificate-art/ → the signature and phoenix the sheet places

API routes group by what they serve: `flashcards`, `memorization`, `questions`
and `attempts` for studying and sitting exams; `progress`, `streaks`,
`recent-activity` and `nudges` for what a learner has done; `admin` and
`invites` for the console; `auth` and `user` for accounts.

## Notes

- Every query lives in `src/server/data/`, through Prisma. Routes and pages
  call those modules; none builds a query itself. The mastery counts are two
  SQL views, read only by `src/server/data/mastery.ts`.
- Auth is Auth.js v5, Credentials provider, JWT sessions. No session table.
- The rules live in `src/lib/helper/` rather than in the pages, so eligibility,
  streaks, readiness, resume behaviour and the rest are tested directly. Run
  `pnpm test`.
- API responses are `no-store`. They are per-learner and behind auth, so caching
  them once served one learner's answers to the next.

## Team

- **Frontend:** Reinwel Tingson, Justin Jan Dalumpines
- **Backend:** Nelson Lago III
