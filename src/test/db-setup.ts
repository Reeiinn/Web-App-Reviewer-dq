import { afterAll } from "vitest";
import { assertLocalDatabase } from "@/server/db/local-guard";
import prisma from "@/server/db/prisma";

// Belt and braces: the data modules read DATABASE_URL, and in this project it
// must be the local test database.
assertLocalDatabase(process.env.DATABASE_URL);

afterAll(async () => {
  await prisma.$disconnect();
});
