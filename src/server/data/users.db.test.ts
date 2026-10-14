import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/server/db/prisma";
import { createUser, deleteUsers, uniqueSuffix } from "@/test/db-fixtures";
import {
  findActiveUserId,
  findResetToken,
  findSignInAccount,
  getAvatar,
  getSessionClaims,
  issueResetToken,
  markTourSeen,
  resetPassword,
  setAvatar,
} from "./users";

// Every user a test makes is listed here and removed in one statement, so a
// manager and their recruits go together (users.manager_id has no delete
// rule) and everything that cascades from them goes too.
const made: string[] = [];
async function user(overrides?: Parameters<typeof createUser>[0]) {
  const created = await createUser(overrides);
  made.push(created.id);
  return created;
}
const softDelete = (id: string) =>
  prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });

afterAll(async () => {
  await deleteUsers(...made);
});

describe("sign-in reads", () => {
  it("finds an active account with what the session needs", async () => {
    const manager = await user({ role: "MANAGER" });

    const found = await findSignInAccount(manager.email);

    expect(found).toEqual({
      id: manager.id,
      email: manager.email,
      password: "not-a-real-hash",
      name: expect.any(String),
      role: "MANAGER",
      managerId: null,
      onboardingToursSeen: [],
    });
  });

  it("reads the current role and manager for a session refresh", async () => {
    const manager = await user({ role: "MANAGER" });
    const recruit = await user({ managerId: manager.id });

    expect(await getSessionClaims(recruit.id)).toEqual({
      role: "USER",
      managerId: manager.id,
      onboardingToursSeen: [],
    });
  });

  it("treats a soft-deleted account as gone", async () => {
    const gone = await user();
    await softDelete(gone.id);

    expect(await findSignInAccount(gone.email)).toBeNull();
    expect(await getSessionClaims(gone.id)).toBeNull();
  });

  it("answers null for an address nobody has", async () => {
    expect(
      await findSignInAccount(`nobody-${uniqueSuffix()}@example.test`),
    ).toBeNull();
  });
});

describe("avatar", () => {
  it("stores, reads and clears the photo", async () => {
    const me = await user();
    const photo = "data:image/png;base64,AAAA";

    await setAvatar(me.id, photo);
    expect(await getAvatar(me.id)).toBe(photo);

    await setAvatar(me.id, null);
    expect(await getAvatar(me.id)).toBeNull();
  });

  it("reads no photo for a soft-deleted account", async () => {
    const gone = await user();
    await setAvatar(gone.id, "data:image/png;base64,AAAA");
    await softDelete(gone.id);

    expect(await getAvatar(gone.id)).toBeNull();
  });
});

describe("tours", () => {
  it("records a role's tour once, however often it is marked", async () => {
    const me = await user({ role: "MANAGER" });

    await markTourSeen(me.id, "MANAGER");
    await markTourSeen(me.id, "MANAGER");
    await markTourSeen(me.id, "USER");

    const claims = await getSessionClaims(me.id);
    expect(claims?.onboardingToursSeen).toEqual(["MANAGER", "USER"]);
  });
});

describe("password reset", () => {
  const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000);
  const passwordOf = async (id: string) =>
    (await prisma.user.findUniqueOrThrow({ where: { id } })).password;

  it("finds active accounts only", async () => {
    const me = await user();
    const gone = await user();
    await softDelete(gone.id);

    expect(await findActiveUserId(me.email)).toBe(me.id);
    expect(await findActiveUserId(gone.email)).toBeNull();
  });

  it("spends every earlier link when a new one is issued", async () => {
    const me = await user();
    const first = `hash-${uniqueSuffix()}`;
    const second = `hash-${uniqueSuffix()}`;

    await issueResetToken(me.id, first, inAnHour());
    await issueResetToken(me.id, second, inAnHour());

    expect((await findResetToken(first))?.usedAt).toBeInstanceOf(Date);
    expect(await findResetToken(second)).toMatchObject({
      userId: me.id,
      usedAt: null,
    });
  });

  it("sets the password once and refuses the same link again", async () => {
    const me = await user();
    const hash = `hash-${uniqueSuffix()}`;
    await issueResetToken(me.id, hash, inAnHour());
    const token = (await findResetToken(hash))!;
    const before = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });

    expect(await resetPassword(token.id, me.id, "new-hash")).toBe(true);
    expect(await passwordOf(me.id)).toBe("new-hash");

    // The trigger, not Prisma, moves updated_at.
    const after = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());

    expect(await resetPassword(token.id, me.id, "other-hash")).toBe(false);
    expect(await passwordOf(me.id)).toBe("new-hash");
  });

  it("refuses an expired link and leaves the password alone", async () => {
    const me = await user();
    const hash = `hash-${uniqueSuffix()}`;
    await issueResetToken(me.id, hash, new Date(Date.now() - 1000));
    const token = (await findResetToken(hash))!;

    expect(await resetPassword(token.id, me.id, "new-hash")).toBe(false);
    expect(await passwordOf(me.id)).toBe("not-a-real-hash");
    expect((await findResetToken(hash))?.usedAt).toBeNull();
  });

  it("finds nothing for an unknown hash", async () => {
    expect(await findResetToken(`hash-${uniqueSuffix()}`)).toBeNull();
  });
});
