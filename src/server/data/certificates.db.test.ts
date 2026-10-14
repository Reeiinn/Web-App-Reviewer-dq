import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/server/db/prisma";
import { createUser, deleteUsers } from "@/test/db-fixtures";
import { issueCertificate } from "./certificates";

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
