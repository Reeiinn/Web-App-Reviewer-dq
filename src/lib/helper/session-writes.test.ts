import { describe, expect, it, vi } from "vitest";
import { createWriteQueue } from "./session-writes";

const deferred = () => {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("createWriteQueue", () => {
  it("starts a write only once the one before it has answered", async () => {
    const queue = createWriteQueue();
    const slow = deferred();
    const order: string[] = [];

    const first = queue(() => {
      order.push("delete:start");
      return slow.promise.then(() => order.push("delete:done"));
    });
    const second = queue(() => {
      order.push("put:start");
      return Promise.resolve();
    });

    // The queue hands the first write out on the next tick; the second is
    // still waiting on it.
    await Promise.resolve();
    expect(order).toEqual(["delete:start"]);

    slow.resolve();
    await Promise.all([first, second]);

    expect(order).toEqual(["delete:start", "delete:done", "put:start"]);
  });

  it("keeps going after a write fails", async () => {
    const onError = vi.fn();
    const queue = createWriteQueue(onError);
    const ran: string[] = [];

    queue(() => Promise.reject(new Error("offline")));
    await queue(() => {
      ran.push("second");
      return Promise.resolve();
    });

    expect(ran).toEqual(["second"]);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
