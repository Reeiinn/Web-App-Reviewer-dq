import { describe, expect, it } from "vitest";
import {
  assertLocalDatabase,
  isLocalDatabase,
  sameLocalDatabase,
} from "./local-guard";

describe("isLocalDatabase", () => {
  it.each([
    "postgresql://postgres:pw@localhost:5432/insureprep_dev",
    "postgresql://postgres:pw@127.0.0.1/insureprep_test",
    "postgres://u@[::1]:5432/db",
    "postgresql://u:pw@db.localhost:5432/db",
  ])("accepts %s", (url) => {
    expect(isLocalDatabase(url)).toBe(true);
  });

  it.each([
    "postgresql://postgres:pw@containers.railway.app:6543/railway",
    "postgresql://u:pw@localhost.evil.com/db",
    "postgresql://u:pw@10.0.0.5/db",
    "not a url",
    "",
    // pg connects to a host= or hostaddr= parameter, not the URL's host.
    "postgresql://u:pw@localhost/db?host=containers.railway.app",
    "postgresql://u:pw@localhost/db?hostaddr=10.0.0.5",
  ])("rejects %s", (url) => {
    expect(isLocalDatabase(url)).toBe(false);
  });
});

describe("assertLocalDatabase", () => {
  it("returns a local URL unchanged", () => {
    const url = "postgresql://u@localhost/db";
    expect(assertLocalDatabase(url)).toBe(url);
  });

  it("refuses a missing URL", () => {
    expect(() => assertLocalDatabase(undefined)).toThrow(/not set/);
  });

  it("refuses a remote URL without naming its credentials", () => {
    const url = "postgresql://postgres:s3cret@containers.railway.app/railway";
    expect(() => assertLocalDatabase(url)).toThrow(/containers\.railway\.app/);
    expect(() => assertLocalDatabase(url)).not.toThrow(/s3cret/);
  });

  it("allows a remote URL only when asked to", () => {
    const url = "postgresql://u@containers.railway.app/railway";
    expect(assertLocalDatabase(url, { allowRemote: true })).toBe(url);
  });
});

describe("sameLocalDatabase", () => {
  it("treats the loopback spellings as one host", () => {
    expect(
      sameLocalDatabase(
        "postgresql://u@127.0.0.1/insure_dev",
        "postgresql://u@localhost:5432/insure_dev",
      ),
    ).toBe(true);
    expect(
      sameLocalDatabase("postgres://u@[::1]/Insure_Dev", "postgres://u@localhost/insure_dev"),
    ).toBe(true);
  });

  it("tells different databases apart", () => {
    expect(
      sameLocalDatabase("postgresql://u@localhost/insure", "postgresql://u@localhost/insure_dev"),
    ).toBe(false);
    expect(
      sameLocalDatabase("postgresql://u@localhost:5433/insure", "postgresql://u@localhost/insure"),
    ).toBe(false);
  });
});
