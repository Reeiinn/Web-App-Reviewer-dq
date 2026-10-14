import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/server/db/prisma";
import { createUser, deleteUsers, uniqueSuffix } from "@/test/db-fixtures";
import {
  findSignInAccount,
  getAvatar,
  getSessionClaims,
  markTourSeen,
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
