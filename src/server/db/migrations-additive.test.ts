import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { nonAdditiveStatements } from "./migrations-additive";

describe("nonAdditiveStatements", () => {
  it("accepts creating new objects", () => {
    expect(
      nonAdditiveStatements(
        `CREATE TABLE "t" ("id" UUID NOT NULL);\nALTER TABLE "t" ADD CONSTRAINT "t_pkey" PRIMARY KEY ("id");\nCREATE VIEW v AS SELECT 1;`,
      ),
    ).toEqual([]);
  });

  it.each([
    ['DROP INDEX "users_active_idx";', "DROP"],
    ['ALTER TABLE "users" DROP COLUMN "image";', "DROP"],
    ['ALTER TABLE "users" RENAME COLUMN "name" TO "full_name";', "RENAME"],
    ['ALTER TABLE "users" ALTER COLUMN "name" TYPE TEXT;', "changes an existing column"],
    ['ALTER TABLE "users" ALTER COLUMN "image" SET NOT NULL;', "changes an existing column"],
    ["TRUNCATE nudges;", "TRUNCATE"],
    ["UPDATE users SET role = 'USER';", "rewrites existing rows"],
    ["  DELETE FROM nudges;", "rewrites existing rows"],
  ])("refuses %s", (sql, reason) => {
    const [problem] = nonAdditiveStatements(sql);
    expect(problem).toContain(reason);
  });

  it("ignores words that only appear in comments", () => {
    expect(nonAdditiveStatements("-- Rollback: DROP VIEW v;\nCREATE VIEW v AS SELECT 1;")).toEqual([]);
  });

  it("lets a reviewed line through when it is marked", () => {
    expect(
      nonAdditiveStatements('DROP INDEX "tmp_idx"; -- additive-check: allow (index created above)'),
    ).toEqual([]);
  });
});

describe("prisma/migrations", () => {
  const root = join(process.cwd(), "prisma", "migrations");
  const migrations = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "0_init")
    .map((entry) => entry.name);

  it.each(migrations)("%s is additive", (name) => {
    const sql = readFileSync(join(root, name, "migration.sql"), "utf8");
    expect(nonAdditiveStatements(sql)).toEqual([]);
  });
});
