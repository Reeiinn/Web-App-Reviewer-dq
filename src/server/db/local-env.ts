import { existsSync } from "node:fs";

/**
 * Loads .env.local into process.env for the Prisma CLI and the scripts run
 * beside it. Only .env.local, never .env: the database URLs for this tooling
 * live there.
 *
 * A variable already set in the shell wins, so a one-off
 * `MIGRATE_DATABASE_URL=... pnpm ...` is not overridden by the file. A
 * missing file is not an error: the Vercel build runs `prisma generate`,
 * which needs no URL, with no .env.local present.
 */
export function loadLocalEnv(path = ".env.local"): void {
  if (existsSync(path)) process.loadEnvFile(path);
}
