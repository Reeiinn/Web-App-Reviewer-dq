# Migrations

`0_init` is the baseline of the database as it stood on 2026-10-14, generated
from the introspected schema and checked against a restore of production: a
database built from these migrations alone dumps (`pg_dump --schema-only`) to
the same schema. On any database that already has the tables it is marked
applied (`prisma migrate resolve --applied 0_init`), never run.

Added to `0_init` by hand, because Prisma's schema cannot express them:

- the `pgcrypto` extension;
- the `set_updated_at` trigger function and its two triggers;
- `NOT NULL` on `users.onboarding_tours_seen`;
- unique *constraints* (Prisma writes unique *indexes*) for the 13 that are
  constraints in production.

`pg_stat_statements`, the host's monitoring extension, is deliberately left
out.

## Rules

Every migration here is additive. See the ground rules in
`docs/superpowers/specs/2026-10-14-prisma-migration-design.md`.

- Write migrations by hand, or generate with `prisma migrate dev --create-only`
  and read every line before applying. Delete any `DROP` or `ALTER` of an
  object that already exists.
- The CLI reads `MIGRATE_DATABASE_URL` and refuses a non-local host unless
  `ALLOW_REMOTE_MIGRATE=1`. `SHADOW_DATABASE_URL` must be local; it is wiped.
- Before applying to production, check it has not drifted from these
  migrations (read-only):
  `prisma migrate diff --from-config-datasource --to-migrations prisma/migrations --script`
  must print an empty migration.
