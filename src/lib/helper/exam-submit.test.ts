import { describe, expect, it } from "vitest";
import { resendAnswers } from "./exam-submit";

const ok = () => Promise.resolve(true);

describe("resendAnswers", () => {
  it("returns nothing when every answer saves", async () => {
    expect(await resendAnswers(["q1", "q2", "q3"], ok)).toEqual([]);
  });

  it("returns the answers the server refused, so the exam is not scored without them", async () => {
    const send = (id: string) => Promise.resolve(id !== "q2");
    expect(await resendAnswers(["q1", "q2", "q3"], send)).toEqual(["q2"]);
  });

  it("counts a request that never came back as unsaved", async () => {
    const send = (id: string) =>
      id === "q1" ? Promise.reject(new Error("offline")) : Promise.resolve(true);
    expect(await resendAnswers(["q1", "q2"], send)).toEqual(["q1"]);
  });

  it("sends a few at a time rather than the whole paper at once", async () => {
    let inFlight = 0;
    let most = 0;
    const send = async () => {
      inFlight++;
      most = Math.max(most, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return true;
    };

    const ids = Array.from({ length: 20 }, (_, i) => `q${i}`);
    expect(await resendAnswers(ids, send, 3)).toEqual([]);
    expect(most).toBe(3);
  });
});
