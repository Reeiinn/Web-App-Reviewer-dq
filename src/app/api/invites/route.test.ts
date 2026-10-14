import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { auth, emailHasAccount, createInvite, sendMail, mailerConfigured } =
  vi.hoisted(() => ({
    auth: vi.fn(),
    emailHasAccount: vi.fn(),
    createInvite: vi.fn(),
    sendMail: vi.fn(),
    mailerConfigured: vi.fn(),
  }));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/staff", () => ({ touchLastSeen: vi.fn() }));
vi.mock("@/server/data/users", () => ({ emailHasAccount, createInvite }));
vi.mock("@/lib/mailer", () => ({ sendMail, mailerConfigured }));

import { POST } from "./route";

const EXPIRES = new Date("2026-10-21T09:00:00.000Z");

function request(payload?: unknown) {
  return new Request("http://internal.local/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
}

beforeEach(() => {
  vi.stubEnv("APP_URL", "https://insure.example.com");
  auth.mockResolvedValue({
    user: { id: "admin-1", role: "ADMIN", name: "Sam" },
  });
  emailHasAccount.mockResolvedValue(false);
  createInvite.mockImplementation(
    async (input: { code: string; role: string; email: string | null }) => ({
      code: input.code,
      expiresAt: EXPIRES,
      role: input.role,
      email: input.email,
    }),
  );
  mailerConfigured.mockReturnValue(true);
  sendMail.mockResolvedValue({ sent: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST /api/invites", () => {
  it("returns the open link in today's snake_case shape", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(Object.keys(body)).toEqual([
      "code",
      "expires_at",
      "role",
      "email",
      "link",
    ]);
    expect(body).toMatchObject({
      expires_at: "2026-10-21T09:00:00.000Z",
      role: "USER",
      email: null,
      link: `https://insure.example.com/signup?code=${encodeURIComponent(body.code)}`,
    });
    expect(createInvite).toHaveBeenCalledWith({
      code: expect.any(String),
      createdBy: "admin-1",
      role: "USER",
      email: null,
    });
  });

  it("emails an addressed invite and reports how it went", async () => {
    const response = await POST(
      request({ role: "MANAGER", email: " Lead@Example.com " }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(emailHasAccount).toHaveBeenCalledWith("lead@example.com");
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(body).toMatchObject({
      role: "MANAGER",
      email: "lead@example.com",
      sent: true,
      mailerConfigured: true,
    });
  });

  it("refuses an address that already has an account", async () => {
    emailHasAccount.mockResolvedValue(true);

    const response = await POST(
      request({ role: "MANAGER", email: "taken@example.com" }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "That email already has an account.",
    });
    expect(createInvite).not.toHaveBeenCalled();
  });
});
