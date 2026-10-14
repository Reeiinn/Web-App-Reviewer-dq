import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findActiveUserId, issueResetToken, sendMail, mailerConfigured } =
  vi.hoisted(() => ({
    findActiveUserId: vi.fn(),
    issueResetToken: vi.fn(),
    sendMail: vi.fn(),
    mailerConfigured: vi.fn(),
  }));

vi.mock("@/server/data/users", () => ({ findActiveUserId, issueResetToken }));
vi.mock("@/lib/mailer", () => ({ sendMail, mailerConfigured }));

import { POST } from "./route";

const KNOWN = "member@example.com";

function request(email: string) {
  return new Request("http://internal.local/api/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

beforeEach(() => {
  vi.stubEnv("APP_URL", "https://insure.example.com");
  mailerConfigured.mockReturnValue(true);
  sendMail.mockResolvedValue({ sent: true });
  findActiveUserId.mockImplementation((email: string) =>
    Promise.resolve(email === KNOWN ? "7" : null),
  );
  issueResetToken.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST /api/auth/forgot-password", () => {
  it("emails the reset link in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await POST(request(KNOWN));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(issueResetToken).toHaveBeenCalledWith(
      "7",
      expect.any(String),
      expect.any(Date),
    );

    const mail = sendMail.mock.calls[0][0];
    expect(mail.to).toBe(KNOWN);
    expect(mail.text).toContain(
      "https://insure.example.com/reset-password?token=",
    );

    // The link never rides back to an unauthenticated caller in production:
    // anyone who knows an address could then take the account over.
    expect(body.resetUrl).toBeUndefined();
  });

  it("sends nothing for an address that is not registered", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await POST(request("stranger@example.com"));
    const body = await response.json();

    expect(sendMail).not.toHaveBeenCalled();
    expect(issueResetToken).not.toHaveBeenCalled();
    expect(body.message).toContain("If that email is registered");
  });

  it("hands the link back outside production so the flow stays usable", async () => {
    vi.stubEnv("NODE_ENV", "development");
    mailerConfigured.mockReturnValue(false);
    sendMail.mockResolvedValue({ sent: false, reason: "not-configured" });

    const response = await POST(request(KNOWN));
    const body = await response.json();

    expect(body.resetUrl).toContain(
      "https://insure.example.com/reset-password?token=",
    );
  });
});
