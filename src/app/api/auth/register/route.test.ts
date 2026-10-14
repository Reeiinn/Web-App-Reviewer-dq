import { afterEach, describe, expect, it, vi } from "vitest";

const { registerWithInvite } = vi.hoisted(() => ({
  registerWithInvite: vi.fn(),
}));

vi.mock("@/server/data/users", () => ({ registerWithInvite }));
vi.mock("@/lib/helper/signup-grant", () => ({
  createSignupGrant: (email: string) => `grant-for-${email}`,
}));

import { POST } from "./route";

const body = {
  email: "New@Example.com",
  password: "long-enough",
  name: "  New Person ",
  code: "abc",
};

function request(payload: unknown = body) {
  return new Request("http://internal.local/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("POST /api/auth/register", () => {
  it("answers 201 with the snake_case account and a signup grant", async () => {
    registerWithInvite.mockResolvedValue({
      ok: true,
      user: {
        id: "u1",
        email: "new@example.com",
        name: "New Person",
        role: "USER",
        managerId: "m1",
        createdAt: new Date("2026-10-14T09:00:00.000Z"),
      },
    });

    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(await response.text()).toBe(
      JSON.stringify({
        id: "u1",
        email: "new@example.com",
        name: "New Person",
        role: "USER",
        manager_id: "m1",
        created_at: "2026-10-14T09:00:00.000Z",
        signupGrant: "grant-for-new@example.com",
      }),
    );
    expect(registerWithInvite).toHaveBeenCalledWith({
      code: "abc",
      email: "new@example.com",
      name: "New Person",
      passwordHash: expect.stringMatching(/^\$2[aby]\$10\$/),
    });
  });

  it.each([
    [
      { ok: false, reason: "invite", error: "This invitation link has expired." },
      400,
      "This invitation link has expired.",
    ],
    [
      {
        ok: false,
        reason: "claimant",
        error: "This invitation was sent to a different email address.",
      },
      403,
      "This invitation was sent to a different email address.",
    ],
    [{ ok: false, reason: "email-taken" }, 409, "Email already registered"],
  ])("maps %o to %i", async (outcome, status, error) => {
    registerWithInvite.mockResolvedValue(outcome);

    const response = await POST(request());

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error });
  });

  it("answers 500 when the database fails", async () => {
    registerWithInvite.mockRejectedValue(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to register user" });
  });
});
