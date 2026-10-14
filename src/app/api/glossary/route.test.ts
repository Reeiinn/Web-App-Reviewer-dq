import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, listGlossary } = vi.hoisted(() => ({
  auth: vi.fn(),
  listGlossary: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/data/content", () => ({ listGlossary }));
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

import { GET } from "./route";

const get = (query = "") =>
  GET(new Request(`http://internal.local/api/glossary${query}`));

const row = {
  id: "t1",
  exam_type: "VUL",
  term: "Assignee",
  definition: "Someone",
  details: { examples: [{ text: "x" }] },
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue({ user: { id: "u1", role: "USER" } });
  listGlossary.mockResolvedValue([row]);
});

describe("GET /api/glossary", () => {
  it("returns every term with its details", async () => {
    expect(await (await get()).json()).toEqual([row]);
    expect(listGlossary).toHaveBeenCalledWith(null);
  });

  it("ignores q: the page searches client-side", async () => {
    await get("?exam_type=VUL&q=trust");
    expect(listGlossary).toHaveBeenCalledWith("VUL");
  });

  it("answers 400 for an unknown track", async () => {
    expect((await get("?exam_type=FOO")).status).toBe(400);
    expect(listGlossary).not.toHaveBeenCalled();
  });
});
