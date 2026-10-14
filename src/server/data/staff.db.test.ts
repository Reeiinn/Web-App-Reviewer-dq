import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import prisma from "@/server/db/prisma";
import { createUser, deleteUsers } from "@/test/db-fixtures";
import {
  findActiveAccount,
  listManagers,
  listReviewees,
  recordAdminAction,
  removeReviewee,
  touchLastSeen,
} from "./staff";

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

async function named(
  name: string,
  overrides: Parameters<typeof createUser>[0] = {},
  data: { deletedAt?: Date; lastSeenAt?: Date } = {},
) {
  const created = await user(overrides);
  await prisma.user.update({ where: { id: created.id }, data: { name, ...data } });
  return { ...created, name };
}

const mine = <T extends { id: string }>(rows: T[]) => rows.filter((r) => made.includes(r.id));

describe("listReviewees", () => {
  it("gives a manager their own active reviewees, by name", async () => {
    const boss = await named("Boss", { role: "MANAGER" });
    const other = await named("Other", { role: "MANAGER" });
    const zed = await named("Zed", { managerId: boss.id });
    const amy = await named("Amy", { managerId: boss.id });
    await named("Gone", { managerId: boss.id }, { deletedAt: new Date() });
    await named("Staff", { role: "MANAGER", managerId: boss.id });
    await named("Theirs", { managerId: other.id });

    const rows = await listReviewees(boss.id);

    expect(rows.map((r) => r.id)).toEqual([amy.id, zed.id]);
    expect(rows[0]).toEqual({
      id: amy.id,
      email: amy.email,
      name: "Amy",
      image: null,
      manager: { id: boss.id, name: "Boss", email: boss.email, role: "MANAGER", image: null },
    });
  });

  it("gives an admin every reviewee, recruited or not", async () => {
    const boss = await named("Boss", { role: "MANAGER" });
    const recruited = await named("Recruited", { managerId: boss.id });
    const walkIn = await named("Walk-in");

    const rows = mine(await listReviewees(null));

    expect(rows.find((r) => r.id === recruited.id)!.manager!.id).toBe(boss.id);
    expect(rows.find((r) => r.id === walkIn.id)!.manager).toBeNull();
  });

  it("still names a recruiter who has since been removed", async () => {
    const boss = await named("Former", { role: "MANAGER" }, { deletedAt: new Date() });
    const kept = await named("Kept", { managerId: boss.id });

    const [row] = mine(await listReviewees(null)).filter((r) => r.id === kept.id);
    expect(row.manager).toMatchObject({ id: boss.id, name: "Former" });
  });
});

describe("listManagers", () => {
  it("counts each manager's active reviewees and orders by last seen, never-seen last", async () => {
    const early = await named("Early", { role: "MANAGER" }, { lastSeenAt: new Date("2026-10-01T00:00:00Z") });
    const late = await named("Late", { role: "MANAGER" }, { lastSeenAt: new Date("2026-10-10T00:00:00Z") });
    const never = await named("Never", { role: "MANAGER" });
    await named("R1", { managerId: early.id });
    await named("R2", { managerId: early.id });
    await named("Removed", { managerId: early.id }, { deletedAt: new Date() });
    await named("Staff recruit", { role: "MANAGER", managerId: early.id });
    const gone = await named("Gone manager", { role: "MANAGER" }, { deletedAt: new Date() });
    const admin = await named("An admin", { role: "ADMIN" });

    const rows = mine(await listManagers());

    // Other managers made by earlier tests are interleaved; check these three.
    expect(
      rows.filter((r) => [early.id, late.id, never.id].includes(r.id)).map((r) => r.name),
    ).toEqual(["Late", "Early", "Never"]);
    expect(rows.find((r) => r.id === early.id)).toEqual({
      id: early.id,
      name: "Early",
      email: early.email,
      image: null,
      lastSeenAt: new Date("2026-10-01T00:00:00Z"),
      reviewees: 2,
    });
    expect(rows.find((r) => r.id === never.id)!.lastSeenAt).toBeNull();
    expect(rows.find((r) => r.id === late.id)!.reviewees).toBe(0);
    expect(rows.find((r) => r.id === gone.id || r.id === admin.id)).toBeUndefined();
  });
});

describe("findActiveAccount", () => {
  it("reads what a staff action checks, and nothing for a removed account", async () => {
    const boss = await user({ role: "MANAGER" });
    const me = await named("Rae", { managerId: boss.id });

    expect(await findActiveAccount(me.id)).toEqual({
      id: me.id, name: "Rae", email: me.email, role: "USER", managerId: boss.id,
    });

    await prisma.user.update({ where: { id: me.id }, data: { deletedAt: new Date() } });
    expect(await findActiveAccount(me.id)).toBeNull();
    expect(await findActiveAccount(randomUUID())).toBeNull();
  });
});

describe("removeReviewee", () => {
  it("stamps deleted_at once and reports whether this call did it", async () => {
    const me = await user();
    const before = Date.now();

    expect(await removeReviewee(me.id)).toBe(true);
    const { deletedAt } = await prisma.user.findUniqueOrThrow({
      where: { id: me.id },
      select: { deletedAt: true },
    });
    expect(deletedAt!.getTime()).toBeGreaterThanOrEqual(before);

    expect(await removeReviewee(me.id)).toBe(false);
    const again = await prisma.user.findUniqueOrThrow({
      where: { id: me.id },
      select: { deletedAt: true },
    });
    expect(again.deletedAt).toEqual(deletedAt);
  });

  it("lets only one of two simultaneous removals claim it", async () => {
    const me = await user();
    const results = await Promise.all([removeReviewee(me.id), removeReviewee(me.id)]);
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("keeps everything the reviewee did", async () => {
    const me = await user();
    await prisma.studyStreak.create({ data: { userId: me.id, examType: "VUL" } });
    await removeReviewee(me.id);
    expect(await prisma.studyStreak.count({ where: { userId: me.id } })).toBe(1);
  });
});
