import { describe, expect, it } from "vitest";
import { assertLocalDatabase, isLocalDatabase } from "./local-guard";

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
