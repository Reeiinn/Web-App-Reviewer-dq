import { randomUUID } from "node:crypto";
import prisma from "@/server/db/prisma";

export const uniqueSuffix = () => randomUUID().slice(0, 8);

export async function createUser(
  overrides: {
    role?: "USER" | "MANAGER" | "ADMIN";
    managerId?: string;
  } = {},
) {
  const suffix = uniqueSuffix();
  return prisma.user.create({
    data: {
      email: `test-${suffix}@example.test`,
      password: "not-a-real-hash",
      name: `Test ${suffix}`,
      role: overrides.role ?? "USER",
      managerId: overrides.managerId ?? null,
    },
    select: { id: true, email: true },
  });
}

export async function deleteUsers(...ids: string[]) {
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}
