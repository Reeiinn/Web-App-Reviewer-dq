import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SIGNUP_GRANT_TTL_MS,
  createSignupGrant,
  isValidSignupGrant,
} from "./signup-grant";

const NOW = 1_800_000_000_000;

describe("signup grants", () => {
  const original = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.AUTH_SECRET = original;
  });

  it("accepts the grant it just issued, for the address it names", () => {
    const grant = createSignupGrant("Ada@Example.com", NOW);

    expect(isValidSignupGrant(grant, "ada@example.com", NOW + 1000)).toBe(true);
    // The address is folded, so the casing typed at signup does not matter.
    expect(isValidSignupGrant(grant, "ADA@example.com", NOW + 1000)).toBe(true);
  });

  it("refuses a grant meant for somebody else", () => {
    const grant = createSignupGrant("ada@example.com", NOW);

    expect(isValidSignupGrant(grant, "alan@example.com", NOW + 1000)).toBe(
      false,
    );
  });

  it("refuses one that has expired", () => {
    const grant = createSignupGrant("ada@example.com", NOW);

    expect(
      isValidSignupGrant(grant, "ada@example.com", NOW + SIGNUP_GRANT_TTL_MS),
    ).toBe(false);
  });

  it("refuses a forged or damaged grant", () => {
    const grant = createSignupGrant("ada@example.com", NOW);
    const [expiry, signature] = grant.split(".");

    expect(isValidSignupGrant(undefined, "ada@example.com", NOW)).toBe(false);
    expect(isValidSignupGrant("", "ada@example.com", NOW)).toBe(false);
    expect(isValidSignupGrant(expiry, "ada@example.com", NOW)).toBe(false);
    expect(
      isValidSignupGrant(
        `${expiry}.${"f".repeat(signature.length)}`,
        "ada@example.com",
        NOW,
      ),
    ).toBe(false);
    // A later expiry cannot simply be written in: it is part of what is signed.
    expect(
      isValidSignupGrant(
        `${Number(expiry) + 60_000}.${signature}`,
        "ada@example.com",
        NOW,
      ),
    ).toBe(false);
  });

  it("trusts nothing when there is no secret to sign with", () => {
    const grant = createSignupGrant("ada@example.com", NOW);
    process.env.AUTH_SECRET = "";

    expect(isValidSignupGrant(grant, "ada@example.com", NOW + 1000)).toBe(
      false,
    );
  });
});
