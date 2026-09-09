# InsurePrep — Insurance Licensing Review

A full-stack exam reviewer app for insurance licensing candidates, covering two exam tracks:

- **VUL** (Variable Universal Life)
- **Traditional Life**

Built with Next.js (App Router), PostgreSQL, and Auth.js v5.

## Features

- **Flash Cards** — front/back recall-based study cards
- **Memorization** — multiple-choice practice cards with instant feedback
- **Vocabulary** — glossary of key terms per exam track
- **Practice Exams** — timed, scored exam attempts with per-question review
- **Progress Tracking** — per-track mastery percentages across flashcards, memorization, and practice questions
- **Certificates** — issued after passing requirements are met

## Tech Stack

- **Framework:** Next.js (App Router)
- **Database:** PostgreSQL, hosted on [Railway](https://railway.com)
- **DB Client:** [`pg`](https://node-postgres.com/) (raw SQL, no ORM)
- **Auth:** [Auth.js v5](https://authjs.dev/) — Credentials provider, JWT session strategy
- **Styling:** Tailwind CSS

## Getting Started

### 1. Install dependencies

    npm install

### 2. Set up environment variables

Create `.env.local`:

    DATABASE_URL="postgresql://postgres:<password>@<host>:<port>/railway"
    AUTH_SECRET="your-generated-secret"

    # Optional. Outbound mail, used to send Field Manager invitations.
    # Without both, an invitation is still created and the link is handed
    # back in the dialog to send by hand.
    RESEND_API_KEY="re_..."
    MAIL_FROM="INSURE <invites@yourdomain.com>"

Leave `APP_URL` unset here. Locally the links a signup invite or a password
reset carries are built from the request, which is what makes them open on the
dev server you are running.

### Deployment

Set `APP_URL` in the production environment to the address the app is served at:

    APP_URL="https://insureph.app"

Invitations and password resets are opened from a chat or an inbox, somewhere
other than the machine that made them, so they are built on this address rather
than on the host a request arrived at. On Vercel it may be left out — the
platform's own production domain is used — but setting it pins every link to
the custom domain rather than to the `*.vercel.app` one.

NextAuth is a separate matter: behind a proxy, set `AUTH_URL` to the same
address (or `AUTH_TRUST_HOST=true`) so sign-in callbacks land on the right
host. `AUTH_URL` also serves as the link address when `APP_URL` is absent.

Generate an `AUTH_SECRET`:

    npx auth secret

### 3. Run database migrations

Migrations live in `src/migration/`. Apply them against your Railway Postgres instance using `psql`:

    psql "$env:DATABASE_URL" -f src/migration/1.sql
    psql "$env:DATABASE_URL" -f src/migration/2.sql
    psql "$env:DATABASE_URL" -f src/migration/3.sql

> On Windows, if `psql` isn't recognized, add it to your session PATH first:
>
>     $env:Path += ";C:\Program Files\PostgreSQL\18\bin"

### 4. Run the development server

    npm run dev

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

    src/
      app/
        api/            → Next.js API routes (questions, flashcards, memorization, attempts, progress, auth)
        ...              → frontend pages/components
      lib/
        db.ts            → shared Postgres connection pool
        types/           → shared TypeScript types
      migration/          → raw SQL migration files

## Notes

- No ORM — all queries are raw SQL via `pg`, with hand-written migrations.
- Auth uses Auth.js v5 with a Credentials provider and JWT sessions (no separate session table).

## Team

- **Frontend:** Reinwel Tingson, Justin Jan Dalumpines
- **Backend:** Nelson Lago III
