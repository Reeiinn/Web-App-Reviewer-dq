import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "@/server/db/prisma";
import { examTypes } from "@/lib/types/common";
import { createUser, deleteUsers } from "@/test/db-fixtures";
import { getFocusTracks, getFocusTracksFor, setFocusTracks } from "./focus-tracks";

let a: string;
let b: string;

beforeAll(async () => {
  a = (await createUser()).id;
  b = (await createUser()).id;
});

afterAll(async () => {
  await deleteUsers(a, b);
});

describe("focus tracks", () => {
  it("reads a user with nothing saved as all four", async () => {
    expect(await getFocusTracks(a)).toEqual({
      tracks: ["VUL", "TRADITIONAL_LIFE", "IIAP_A", "IIAP_B"],
      chosen: false,
    });
  });

  it("saves a pick and reads it back in order", async () => {
    expect(await setFocusTracks(a, ["IIAP_A", "VUL"])).toEqual({ tracks: ["VUL", "IIAP_A"], chosen: true });
    expect(await getFocusTracks(a)).toEqual({ tracks: ["VUL", "IIAP_A"], chosen: true });
  });

  it("replaces rather than adds to an earlier pick", async () => {
    await setFocusTracks(a, ["TRADITIONAL_LIFE"]);
    expect((await getFocusTracks(a)).tracks).toEqual(["TRADITIONAL_LIFE"]);
    expect(await prisma.userFocusTrack.count({ where: { userId: a } })).toBe(1);
  });

  it("keeps the old pick when the replacement fails", async () => {
    await setFocusTracks(a, ["VUL"]);
    // A duplicate violates the primary key inside the transaction.
    await expect(setFocusTracks(a, ["IIAP_B", "IIAP_B"])).rejects.toThrow();
    expect((await getFocusTracks(a)).tracks).toEqual(["VUL"]);
  });

  it("answers for every user in one call", async () => {
    await setFocusTracks(a, ["VUL"]);
    const map = await getFocusTracksFor([a, b]);
    expect(map.get(a)).toEqual({ tracks: ["VUL"], chosen: true });
    expect(map.get(b)?.chosen).toBe(false);
    expect((await getFocusTracksFor([])).size).toBe(0);
  });

  it("reads a user with no rows as all four, alone and in a batch", async () => {
    const { id } = await createUser();
    try {
      expect(await getFocusTracks(id)).toEqual({ tracks: [...examTypes], chosen: false });
      expect((await getFocusTracksFor([id])).get(id)).toEqual({
        tracks: [...examTypes],
        chosen: false,
      });
    } finally {
      await deleteUsers(id);
    }
  });
});
