import { beforeEach, describe, expect, it, vi } from "vitest";
import { cachedFetch, invalidateCached, putCached } from "./client-cache";

const key = () => `test:${Math.random()}`;

describe("cachedFetch", () => {
  beforeEach(() => vi.useRealTimers());

  it("goes to the network once inside the window", async () => {
    const k = key();
    const load = vi.fn(async () => "photo");

    expect(await cachedFetch(k, load, 60_000)).toBe("photo");
    expect(await cachedFetch(k, load, 60_000)).toBe("photo");

    expect(load).toHaveBeenCalledTimes(1);
  });

  it("shares one request between callers that ask at once", async () => {
    const k = key();
    const load = vi.fn(
      () => new Promise<string>((resolve) => setTimeout(() => resolve("x"), 5)),
    );

    const [a, b] = await Promise.all([
      cachedFetch(k, load, 60_000),
      cachedFetch(k, load, 60_000),
    ]);

    expect([a, b]).toEqual(["x", "x"]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("asks again once the answer is stale", async () => {
    const k = key();
    const load = vi.fn(async () => "first");

    await cachedFetch(k, load, 0);
    await cachedFetch(k, load, 0);

    expect(load).toHaveBeenCalledTimes(2);
  });

  it("caches nothing when the read fails", async () => {
    const k = key();
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce("second try");

    await expect(cachedFetch(k, load, 60_000)).rejects.toThrow("offline");
    expect(await cachedFetch(k, load, 60_000)).toBe("second try");
  });

  it("takes a value a caller already knows, and drops one on request", async () => {
    const k = key();
    const load = vi.fn(async () => "from network");

    putCached(k, "just uploaded");
    expect(await cachedFetch(k, load, 60_000)).toBe("just uploaded");
    expect(load).not.toHaveBeenCalled();

    invalidateCached(k);
    expect(await cachedFetch(k, load, 60_000)).toBe("from network");
    expect(load).toHaveBeenCalledTimes(1);
  });
});
