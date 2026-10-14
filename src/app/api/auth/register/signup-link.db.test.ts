import bcrypt from "bcryptjs";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/server/db/prisma";
import { createUser, deleteUsers, uniqueSuffix } from "@/test/db-fixtures";
import { isValidSignupGrant } from "@/lib/helper/signup-grant";
import { findSignInAccount } from "@/server/data/users";

// The whole signup link, against the local test database: the console makes
// an invite, the link's ?code= is what the signup page posts, and the account
// that comes back must be one the automatic sign-in can open.
const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/staff", () => ({ touchLastSeen: vi.fn() }));
vi.mock("@/lib/mailer", () => ({
  sendMail: vi.fn().mockResolvedValue({ sent: false, reason: "not-configured" }),
  mailerConfigured: () => false,
}));

import { POST as createInviteRoute } from "@/app/api/invites/route";
import { POST as registerRoute } from "./route";

const made: string[] = [];

afterAll(async () => {
  await deleteUsers(...made);
});

beforeEach(() => {
  vi.stubEnv("APP_URL", "https://insure.example.com");
  vi.stubEnv("AUTH_SECRET", "test-secret");
});

const post = (url: string, body?: unknown) =>
  new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

/** What the signup page does with the link: read ?code= and post it. */
async function signUpThrough(
  link: string,
  form: { name: string; email: string; password: string },
) {
  const code = new URL(link).searchParams.get("code") ?? "";
  const response = await registerRoute(
    post("http://internal.local/api/auth/register", { ...form, code }),
  );
  const body = await response.json();
  if (response.ok) made.push(body.id);
  return { response, body };
}

async function inviteFrom(
  senderRole: "ADMIN" | "MANAGER",
  invite?: { role: string; email: string },
) {
  const sender = await createUser({ role: senderRole });
  made.push(sender.id);
  auth.mockResolvedValue({
    user: { id: sender.id, role: senderRole, name: "Sender" },
  });
  const response = await createInviteRoute(
    post("http://internal.local/api/invites", invite),
  );
  expect(response.status).toBe(201);
  return { sender, link: (await response.json()).link as string };
}

describe("signing up through an invite link", () => {
  it("creates an account the automatic sign-in can open, once", async () => {
    const { sender, link } = await inviteFrom("MANAGER");
    const email = `Recruit-${uniqueSuffix()}@Example.test`;
    const form = { name: " New Recruit ", email, password: "long-enough" };

    const { response, body } = await signUpThrough(link, form);

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      email: email.toLowerCase(),
      name: "New Recruit",
      role: "USER",
      manager_id: sender.id,
    });

    // What authorize() checks on the sign-in that follows.
    expect(isValidSignupGrant(body.signupGrant, email.trim().toLowerCase())).toBe(
      true,
    );
    const account = await findSignInAccount(email.trim().toLowerCase());
    expect(account?.id).toBe(body.id);
    expect(await bcrypt.compare(form.password, account!.password)).toBe(true);

    // The same link again is spent.
    const again = await signUpThrough(link, {
      ...form,
      email: `other-${uniqueSuffix()}@example.test`,
    });
    expect(again.response.status).toBe(400);
    expect(again.body).toEqual({
      error: "This invitation link has already been used.",
    });
  });

  it("lets the addressee of a Unit Manager invite sign up in any case", async () => {
    const address = `lead-${uniqueSuffix()}@example.test`;
    const { link } = await inviteFrom("ADMIN", {
      role: "MANAGER",
      email: address,
    });

    const { response, body } = await signUpThrough(link, {
      name: "Lead",
      email: address.toUpperCase(),
      password: "long-enough",
    });

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ role: "MANAGER", manager_id: null });
    const invite = await prisma.registrationInvite.findFirstOrThrow({
      where: { email: address },
    });
    expect(invite.usedAt).toBeInstanceOf(Date);
  });
});
