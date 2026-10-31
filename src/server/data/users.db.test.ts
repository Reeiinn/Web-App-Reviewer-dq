import { afterAll, describe, expect, it } from "vitest";
import prisma, { POOL_MAX } from "@/server/db/prisma";
import { createUser, deleteUsers, uniqueSuffix } from "@/test/db-fixtures";
import {
  createInvite,
  findActiveUserId,
  findResetToken,
  findSignInAccount,
  getAvatar,
  getSessionClaims,
  isActiveRecruit,
  issueResetToken,
  markTourSeen,
  registerWithInvite,
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
      focusTracks: null,
    });
  });

  it("reads the current role and manager for a session refresh", async () => {
    const manager = await user({ role: "MANAGER" });
    const recruit = await user({ managerId: manager.id });

    expect(await getSessionClaims(recruit.id)).toEqual({
      role: "USER",
      managerId: manager.id,
      onboardingToursSeen: [],
      focusTracks: null,
    });
  });

  // The middleware sends a reviewee with no pick to the picker, so the claim
  // has to tell "never picked" (null) from a pick, in the standard order.
  it("carries the exam pick, in order, on sign-in and refresh", async () => {
    const reviewee = await user();
    await prisma.userFocusTrack.createMany({
      data: [
        { userId: reviewee.id, examType: "IIAP_B" },
        { userId: reviewee.id, examType: "VUL" },
      ],
    });

    expect((await findSignInAccount(reviewee.email))?.focusTracks).toEqual([
      "VUL",
      "IIAP_B",
    ]);
    expect((await getSessionClaims(reviewee.id))?.focusTracks).toEqual([
      "VUL",
      "IIAP_B",
    ]);
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

describe("invites", () => {
  const code = () => `code-${uniqueSuffix()}`;
  const inviteBy = (c: string) =>
    prisma.registrationInvite.findUniqueOrThrow({ where: { code: c } });

  it("makes an open link that lasts seven days", async () => {
    const admin = await user({ role: "ADMIN" });
    const c = code();

    const invite = await createInvite({
      code: c, createdBy: admin.id, role: "USER", email: null,
    });

    expect(invite).toMatchObject({ code: c, role: "USER", email: null });
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(
      Math.abs(invite.expiresAt.getTime() - (Date.now() + sevenDays)),
    ).toBeLessThan(60_000);
  });

  it("replaces an earlier invite to the same address", async () => {
    const admin = await user({ role: "ADMIN" });
    const address = `invitee-${uniqueSuffix()}@example.test`;
    const first = code();
    const second = code();

    await createInvite({ code: first, createdBy: admin.id, role: "MANAGER", email: address });
    await createInvite({ code: second, createdBy: admin.id, role: "MANAGER", email: address });

    expect((await inviteBy(first)).usedAt).toBeInstanceOf(Date);
    expect((await inviteBy(second)).usedAt).toBeNull();
  });
});

describe("registerWithInvite", () => {
  const code = () => `code-${uniqueSuffix()}`;
  const address = () => `new-${uniqueSuffix()}@example.test`;
  const inviteBy = (c: string) =>
    prisma.registrationInvite.findUniqueOrThrow({ where: { code: c } });
  async function register(c: string, email = address()) {
    const outcome = await registerWithInvite({
      code: c, email, name: "New Person", passwordHash: "hash",
    });
    if (outcome.ok) made.push(outcome.user.id);
    return outcome;
  }

  it("creates a reviewee under whoever invited them and spends the link", async () => {
    const manager = await user({ role: "MANAGER" });
    const c = code();
    await createInvite({ code: c, createdBy: manager.id, role: "USER", email: null });
    const email = address();

    const outcome = await register(c, email);

    expect(outcome).toEqual({
      ok: true,
      user: {
        id: expect.any(String),
        email,
        name: "New Person",
        role: "USER",
        managerId: manager.id,
        createdAt: expect.any(Date),
      },
    });
    expect((await inviteBy(c)).usedAt).toBeInstanceOf(Date);
  });

  it("creates a Unit Manager who reports to nobody", async () => {
    const admin = await user({ role: "ADMIN" });
    const c = code();
    const email = address();
    await createInvite({ code: c, createdBy: admin.id, role: "MANAGER", email });

    const outcome = await register(c, email);

    expect(outcome).toMatchObject({ ok: true, user: { role: "MANAGER", managerId: null } });
  });

  it("explains a spent, an unknown and an expired code", async () => {
    const admin = await user({ role: "ADMIN" });
    const spent = code();
    await createInvite({ code: spent, createdBy: admin.id, role: "USER", email: null });
    await register(spent);

    const expired = code();
    await prisma.registrationInvite.create({
      data: { code: expired, createdBy: admin.id, expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await register(spent)).toEqual({
      ok: false, reason: "invite", error: "This invitation link has already been used.",
    });
    expect(await register(code())).toEqual({
      ok: false, reason: "invite", error: "This invitation code is not valid.",
    });
    expect(await register(expired)).toEqual({
      ok: false, reason: "invite", error: "This invitation link has expired.",
    });
  });

  it("refuses someone else's addressed invite and leaves it for them", async () => {
    const admin = await user({ role: "ADMIN" });
    const c = code();
    await createInvite({ code: c, createdBy: admin.id, role: "MANAGER", email: address() });

    expect(await register(c, address())).toEqual({
      ok: false, reason: "claimant",
      error: "This invitation was sent to a different email address.",
    });
    expect((await inviteBy(c)).usedAt).toBeNull();
  });

  it("refuses a registered address and leaves the invite unspent", async () => {
    const admin = await user({ role: "ADMIN" });
    const existing = await user();
    const c = code();
    await createInvite({ code: c, createdBy: admin.id, role: "USER", email: null });

    expect(await register(c, existing.email)).toEqual({
      ok: false, reason: "email-taken",
    });
    expect((await inviteBy(c)).usedAt).toBeNull();
  });

  it("brings a removed reviewee back on their old account, through an invite to that address", async () => {
    const before = await user({ role: "MANAGER" });
    const after = await user({ role: "MANAGER" });
    const gone = await user({ managerId: before.id });
    await softDelete(gone.id);
    const c = code();
    await createInvite({ code: c, createdBy: after.id, role: "USER", email: gone.email });

    const outcome = await register(c, gone.email);

    expect(outcome).toMatchObject({
      ok: true,
      user: { id: gone.id, name: "New Person", managerId: after.id },
    });
    expect((await findSignInAccount(gone.email))?.password).toBe("hash");
    expect((await inviteBy(c)).usedAt).toBeInstanceOf(Date);
  });

  it("ends a reset link issued before the account came back", async () => {
    const admin = await user({ role: "ADMIN" });
    const gone = await user();
    const tokenHash = `hash-${uniqueSuffix()}`;
    await issueResetToken(gone.id, tokenHash, new Date(Date.now() + 60_000));
    await softDelete(gone.id);
    const c = code();
    await createInvite({ code: c, createdBy: admin.id, role: "USER", email: gone.email });

    await register(c, gone.email);

    expect((await findResetToken(tokenHash))?.usedAt).toBeInstanceOf(Date);
  });

  it("records that a removed account came back", async () => {
    const admin = await user({ role: "ADMIN" });
    const gone = await user();
    await softDelete(gone.id);
    const c = code();
    await createInvite({ code: c, createdBy: admin.id, role: "USER", email: gone.email });

    await register(c, gone.email);

    expect(
      await prisma.adminAction.count({
        where: { action: "reviewee.restored", targetId: gone.id, targetEmail: gone.email },
      }),
    ).toBe(1);
  });

  it("refuses an open link for a removed account and leaves both as they were", async () => {
    const admin = await user({ role: "ADMIN" });
    const gone = await user();
    await softDelete(gone.id);
    const c = code();
    await createInvite({ code: c, createdBy: admin.id, role: "USER", email: null });

    expect(await register(c, gone.email)).toEqual({
      ok: false, reason: "claimant",
      error: "This email belongs to a removed account. Ask your manager to send an invitation to it.",
    });
    expect(await findSignInAccount(gone.email)).toBeNull();
    expect((await inviteBy(c)).usedAt).toBeNull();
  });

  it("lets only one of two simultaneous signups spend a link", async () => {
    const admin = await user({ role: "ADMIN" });
    const c = code();
    await createInvite({ code: c, createdBy: admin.id, role: "USER", email: null });

    const outcomes = await Promise.all([register(c), register(c)]);

    expect(outcomes.filter((o) => o.ok)).toHaveLength(1);
    expect(outcomes.find((o) => !o.ok)).toEqual({
      ok: false, reason: "invite", error: "This invitation link has already been used.",
    });
  });
});

describe("a busy pool", () => {
  it("waits for a connection to start a signup, as the pg pool did", async () => {
    const admin = await user({ role: "ADMIN" });
    const c = `code-${uniqueSuffix()}`;
    await createInvite({ code: c, createdBy: admin.id, role: "USER", email: null });

    // Hold every one of Prisma's connections for three seconds — longer
    // than Prisma's default two-second wait to start a transaction.
    const hold = () =>
      prisma.$transaction(
        async (tx) => {
          await tx.user.count();
          await new Promise((resolve) => setTimeout(resolve, 3000));
        },
        { timeout: 10_000 },
      );
    const holding = Promise.all(Array.from({ length: POOL_MAX }, hold));
    await new Promise((resolve) => setTimeout(resolve, 200));

    const outcome = await registerWithInvite({
      code: c,
      email: `busy-${uniqueSuffix()}@example.test`,
      name: "Busy",
      passwordHash: "hash",
    });
    await holding;
    if (outcome.ok) made.push(outcome.user.id);

    expect(outcome.ok).toBe(true);
  }, 20_000);
});

describe("isActiveRecruit", () => {
  it("is true only for an active recruit of that manager", async () => {
    const manager = await user({ role: "MANAGER" });
    const otherManager = await user({ role: "MANAGER" });
    const recruit = await user({ managerId: manager.id });
    const leaver = await user({ managerId: manager.id });
    await softDelete(leaver.id);

    expect(await isActiveRecruit(recruit.id, manager.id)).toBe(true);
    expect(await isActiveRecruit(recruit.id, otherManager.id)).toBe(false);
    expect(await isActiveRecruit(leaver.id, manager.id)).toBe(false);
  });
});
