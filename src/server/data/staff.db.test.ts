import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import prisma from "@/server/db/prisma";
import { createUser, deleteUsers } from "@/test/db-fixtures";
import { recordAdminAction, touchLastSeen } from "./staff";

const made: string[] = [];
afterAll(async () => {
  await prisma.adminAction.deleteMany({ where: { actorId: { in: made } } });
  await deleteUsers(...made);
});

async function user(overrides: Parameters<typeof createUser>[0] = {}) {
  const created = await createUser(overrides);
  made.push(created.id);
  return created;
}

/** Silences and captures console.error for one test. */
function quietErrors() {
  return vi.spyOn(console, "error").mockImplementation(() => {});
}

describe("touchLastSeen", () => {
  it("stamps the account with the app's clock", async () => {
    const me = await user();
    const before = Date.now();

    await touchLastSeen(me.id);

    const { lastSeenAt } = await prisma.user.findUniqueOrThrow({
      where: { id: me.id },
      select: { lastSeenAt: true },
    });
    expect(lastSeenAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(lastSeenAt!.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("does nothing, quietly, for an id nobody has", async () => {
    const errors = quietErrors();
    await expect(touchLastSeen(randomUUID())).resolves.toBeUndefined();
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it("logs and swallows a database error", async () => {
    const errors = quietErrors();
    await expect(touchLastSeen("not-a-uuid")).resolves.toBeUndefined();
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});

describe("recordAdminAction", () => {
  it("writes who did what to whom, with the detail", async () => {
    const actor = await user({ role: "ADMIN" });
    const target = await user();

    await recordAdminAction({
      actor: { id: actor.id, email: actor.email, role: "ADMIN" },
      action: "reviewee.removed",
      target: { id: target.id, email: target.email, name: "Rae" },
      detail: { reason: "left the agency" },
    });

    const row = await prisma.adminAction.findFirstOrThrow({ where: { targetId: target.id } });
    expect(row).toMatchObject({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: "ADMIN",
      action: "reviewee.removed",
      targetId: target.id,
      targetEmail: target.email,
      targetName: "Rae",
      detail: { reason: "left the agency" },
    });
  });

  it("stores an empty detail when none is given", async () => {
    const actor = await user({ role: "MANAGER" });
    const target = await user();

    await recordAdminAction({
      actor: { id: actor.id, email: actor.email, role: "MANAGER" },
      action: "reviewee.removed",
      target: { id: target.id, email: null, name: null },
    });

    const row = await prisma.adminAction.findFirstOrThrow({ where: { targetId: target.id } });
    expect(row.detail).toEqual({});
    expect(row.targetEmail).toBeNull();
  });

  it("logs and swallows a failure", async () => {
    const errors = quietErrors();
    await expect(
      recordAdminAction({
        actor: { id: "not-a-uuid", email: "x@example.test", role: "ADMIN" },
        action: "reviewee.removed",
        target: { id: randomUUID(), email: null, name: null },
      }),
    ).resolves.toBeUndefined();
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });
});
