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
});
