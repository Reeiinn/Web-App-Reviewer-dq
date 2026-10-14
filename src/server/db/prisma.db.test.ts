import { Client } from "pg";
import { describe, expect, it } from "vitest";
import prisma from "./prisma";
import { createUser, deleteUsers } from "@/test/db-fixtures";

describe("prisma client", () => {
  it("talks to the local test database", async () => {
    const [row] = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
    expect(row.ok).toBe(1);
  });

  it("round-trips a user through the mapped model", async () => {
    const user = await createUser();
    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found?.email).toBe(user.email);
    await deleteUsers(user.id);
  });

  it("stores and reads the true instant whatever the server's time zone", async () => {
    const user = await createUser();
    const instant = new Date("2026-10-14T09:00:00.000Z");
    await prisma.studyStreak.create({
      data: { userId: user.id, examType: "VUL", lastAnswerAt: instant },
    });

    // Read it back with plain pg, which honours the offset Postgres sends.
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    const { rows } = await client.query(
      "SELECT last_answer_at FROM study_streaks WHERE user_id = $1",
      [user.id],
    );
    await client.end();

    const viaPrisma = await prisma.studyStreak.findFirstOrThrow({
      where: { userId: user.id },
    });
    await deleteUsers(user.id);

    expect((rows[0].last_answer_at as Date).toISOString()).toBe(instant.toISOString());
    expect(viaPrisma.lastAnswerAt?.toISOString()).toBe(instant.toISOString());
  });
});
