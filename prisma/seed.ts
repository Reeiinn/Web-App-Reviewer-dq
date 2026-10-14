import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import type { ExamType } from "../src/generated/prisma/client";
import {
  assertLocalDatabase,
  isLocalDatabase,
} from "../src/server/db/local-guard";
import seedTerms from "../scripts/glossary-seed.cjs";

config({ path: ".env.local" });

type SeedTerm = {
  exam_type: ExamType;
  term: string;
  definition: string;
  details?: Prisma.InputJsonValue | null;
};

const url = assertLocalDatabase(process.env.MIGRATE_DATABASE_URL, {
  allowRemote: process.env.ALLOW_REMOTE_MIGRATE === "1",
});

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: url,
    ssl: isLocalDatabase(url) ? false : { rejectUnauthorized: false },
  }),
});

/**
 * The glossary as its source document has it. Upserted on (exam_type, term),
 * so a reseed updates a term in place rather than adding a second copy.
 */
async function main() {
  const terms = seedTerms as SeedTerm[];
  for (const seed of terms) {
    const details = seed.details ?? Prisma.DbNull;
    await prisma.vocabularyTerm.upsert({
      where: { examType_term: { examType: seed.exam_type, term: seed.term } },
      create: {
        examType: seed.exam_type,
        term: seed.term,
        definition: seed.definition,
        details,
      },
      update: { definition: seed.definition, details },
    });
  }
  console.log(`ok  seeded ${terms.length} vocabulary terms`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
