import { afterAll, describe, expect, it, vi } from "vitest";

// Lets a test choose the next uuids the module draws; empty, it is the real one.
const { nextUuids } = vi.hoisted(() => ({ nextUuids: [] as string[] }));
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return { ...actual, randomUUID: () => nextUuids.shift() ?? actual.randomUUID() };
});
import prisma from "@/server/db/prisma";
import { createUser, deleteUsers } from "@/test/db-fixtures";
import { findHeldCertificate, issueCertificate, listCertificates } from "./certificates";

const made: string[] = [];
afterAll(async () => {
  await deleteUsers(...made);
});

async function user() {
  const created = await createUser();
  made.push(created.id);
  return created;
}

describe("issueCertificate", () => {
  it("issues a numbered certificate dated now", async () => {
    const me = await user();

    const certificate = await issueCertificate(me.id, "VUL");

    expect(certificate).toMatchObject({ userId: me.id, examType: "VUL" });
    expect(certificate!.certificateNo).toMatch(
      new RegExp(`^INS-${certificate!.issuedAt.getUTCFullYear()}-VUL-[0-9A-F]{6}$`),
    );
    expect(Math.abs(certificate!.issuedAt.getTime() - Date.now())).toBeLessThan(60_000);
  });

  it("returns the certificate already held instead of minting a second", async () => {
    const me = await user();
    const first = await issueCertificate(me.id, "TRADITIONAL_LIFE");

    expect(await issueCertificate(me.id, "TRADITIONAL_LIFE")).toEqual(first);
    expect(await prisma.certificate.count({ where: { userId: me.id } })).toBe(1);
  });

  it("hands both of two simultaneous requests the same certificate", async () => {
    const me = await user();

    const [a, b] = await Promise.all([
      issueCertificate(me.id, "IIAP_A"),
      issueCertificate(me.id, "IIAP_A"),
    ]);

    expect(a).not.toBeNull();
    expect(b).toEqual(a);
    expect(await prisma.certificate.count({ where: { userId: me.id } })).toBe(1);
  });

  it("issues one per track", async () => {
    const me = await user();
    const vul = await issueCertificate(me.id, "VUL");
    const iiap = await issueCertificate(me.id, "IIAP_B");
    expect(vul!.id).not.toBe(iiap!.id);
  });
});

describe("reading certificates", () => {
  it("lists a holder's certificates newest first", async () => {
    const me = await user();
    const older = await prisma.certificate.create({
      data: { userId: me.id, examType: "VUL", certificateNo: `T-${me.id}-1`, issuedAt: new Date("2026-01-01T00:00:00.000Z") },
      select: { id: true },
    });
    const newer = await prisma.certificate.create({
      data: { userId: me.id, examType: "IIAP_A", certificateNo: `T-${me.id}-2`, issuedAt: new Date("2026-02-01T00:00:00.000Z") },
      select: { id: true },
    });

    expect((await listCertificates(me.id)).map((c) => c.id)).toEqual([newer.id, older.id]);
  });

  it("finds a certificate for its holder, named off the holder's own row", async () => {
    const me = await user();
    const issued = await issueCertificate(me.id, "VUL");
    const { name } = await prisma.user.findUniqueOrThrow({ where: { id: me.id }, select: { name: true } });

    expect(await findHeldCertificate(issued!.id, me.id)).toEqual({
      id: issued!.id,
      examType: "VUL",
      issuedAt: issued!.issuedAt,
      certificateNo: issued!.certificateNo,
      recipient: name,
    });
  });

  it("treats someone else's certificate as one that does not exist", async () => {
    const holder = await user();
    const stranger = await user();
    const issued = await issueCertificate(holder.id, "VUL");

    expect(await findHeldCertificate(issued!.id, stranger.id)).toBeNull();
    expect(await findHeldCertificate("00000000-0000-4000-8000-000000000000", holder.id)).toBeNull();
  });
});

describe("a certificate number that is already taken", () => {
  it("draws another number instead of leaving the learner without a certificate", async () => {
    const earlier = await user();
    const me = await user();
    nextUuids.push("abcdef00-0000-4000-8000-000000000000");
    const taken = await issueCertificate(earlier.id, "VUL");

    // The same suffix again, then a fresh one.
    nextUuids.push("abcdef00-0000-4000-8000-000000000000", "123456ff-0000-4000-8000-000000000000");
    const mine = await issueCertificate(me.id, "VUL");

    expect(mine).not.toBeNull();
    expect(mine!.userId).toBe(me.id);
    expect(mine!.certificateNo).not.toBe(taken!.certificateNo);
    expect(mine!.certificateNo).toMatch(/-VUL-123456$/);
  });
});
