import { describe, expect, it } from "vitest";
import {
  chunk,
  planRemoval,
  removalDecision,
  removeIdsSchema,
  type RemovalTarget,
} from "./removal";

const admin = { id: "a", role: "ADMIN" } as const;
const unitManager = { id: "m", role: "MANAGER" } as const;
const target = (id: string, over: Partial<RemovalTarget> = {}): RemovalTarget => ({
  id,
  name: id,
  email: `${id}@example.com`,
  role: "USER",
  managerId: "m",
  ...over,
});

describe("removalDecision", () => {
  it("refuses the caller's own account", () => {
    expect(removalDecision(admin, "a", target("a"))).toMatchObject({
      ok: false,
      status: 400,
      reason: "You cannot remove your own account.",
    });
  });

  it("refuses an account that is gone", () => {
    expect(removalDecision(admin, "z", undefined)).toMatchObject({
      ok: false,
      status: 404,
      reason: "That reviewee no longer exists.",
    });
  });

  it("refuses a staff account", () => {
    expect(
      removalDecision(admin, "s", target("s", { role: "MANAGER" })),
    ).toMatchObject({ ok: false, status: 403 });
  });

  it("refuses another unit manager's recruit", () => {
    expect(
      removalDecision(unitManager, "r", target("r", { managerId: "x" })),
    ).toMatchObject({
      ok: false,
      status: 403,
      reason: "You can only remove reviewees you manage.",
    });
  });

  it("lets a unit manager remove their own recruit", () => {
    expect(removalDecision(unitManager, "r", target("r")).ok).toBe(true);
  });

  it("lets an admin remove anyone's recruit", () => {
    expect(
      removalDecision(admin, "r", target("r", { managerId: "x" })).ok,
    ).toBe(true);
  });
});

describe("planRemoval", () => {
  const one = "11111111-1111-4111-8111-111111111111";
  const two = "22222222-2222-4222-8222-222222222222";

  it("removes the permitted, skips the rest with reasons, and dedupes", () => {
    const plan = planRemoval(
      unitManager,
      [one, one, two, "not-a-uuid"],
      new Map([
        [one, target(one)],
        [two, target(two, { managerId: "x" })],
      ]),
    );

    expect(plan.remove.map((row) => row.id)).toEqual([one]);
    expect(plan.skipped).toEqual([
      { id: two, name: two, reason: "You can only remove reviewees you manage." },
      { id: "not-a-uuid", reason: "That reviewee no longer exists." },
    ]);
  });
});

describe("removeIdsSchema", () => {
  it("refuses an empty selection", () => {
    expect(removeIdsSchema.safeParse({ ids: [] }).success).toBe(false);
  });

  it("refuses more than one batch", () => {
    expect(
      removeIdsSchema.safeParse({ ids: Array.from({ length: 201 }, String) })
        .success,
    ).toBe(false);
  });
});

describe("chunk", () => {
  it("splits into batches of the given size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
