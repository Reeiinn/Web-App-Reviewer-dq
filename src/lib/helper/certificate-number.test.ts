import { describe, expect, it } from "vitest";
import { certificateNumber } from "./certificate-number";

describe("certificateNumber", () => {
  it("is INS, the issue year, the track and six hex digits of the uuid", () => {
    expect(
      certificateNumber(
        "VUL",
        new Date("2026-10-14T09:00:00.000Z"),
        "1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d",
      ),
    ).toBe("INS-2026-VUL-1A2B3C");
  });

  it("skips the uuid's hyphens, as the old SQL's replace() did", () => {
    expect(
      certificateNumber(
        "TRADITIONAL_LIFE",
        new Date("2026-10-14T09:00:00.000Z"),
        "abcd-ef01-2345-6789-abcdef012345",
      ),
    ).toBe("INS-2026-TRADITIONAL_LIFE-ABCDEF");
  });

  it("takes the year in UTC, the zone the old SQL ran in", () => {
    // 07:30 on 1 January in Manila is still 31 December in UTC.
    expect(
      certificateNumber(
        "VUL",
        new Date("2026-12-31T23:30:00.000Z"),
        "00000000-0000-4000-8000-000000000000",
      ),
    ).toBe("INS-2026-VUL-000000");
  });
});
