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
