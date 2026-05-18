import { describe, expect, it } from "vitest";
import { jstDayBoundsUtc, toJstDateKey } from "../timezone";

describe("toJstDateKey", () => {
  it("returns the JST calendar date for a UTC midnight input (JST = UTC+9)", () => {
    // 2026-04-19T00:00:00Z is JST 09:00 the same day
    expect(toJstDateKey(new Date("2026-04-19T00:00:00Z"))).toBe("2026-04-19");
  });

  it("rolls forward to the next JST day when UTC is 15:00 (= JST 00:00 of the next day)", () => {
    expect(toJstDateKey(new Date("2026-04-19T15:00:00Z"))).toBe("2026-04-20");
  });

  it("stays on the same JST day at UTC 14:59 (= JST 23:59)", () => {
    expect(toJstDateKey(new Date("2026-04-19T14:59:00Z"))).toBe("2026-04-19");
  });

  it("handles the 15:01 boundary (= JST 00:01 of the next day)", () => {
    expect(toJstDateKey(new Date("2026-04-19T15:01:00Z"))).toBe("2026-04-20");
  });

  it("produces zero-padded month/day", () => {
    expect(toJstDateKey(new Date("2026-01-05T00:00:00Z"))).toBe("2026-01-05");
  });
});

describe("jstDayBoundsUtc", () => {
  it("returns UTC bounds equivalent to JST 00:00 ~ next JST 00:00", () => {
    const { fromUtc, toUtc } = jstDayBoundsUtc("2026-04-19");
    // JST 2026-04-19 00:00 = UTC 2026-04-18 15:00
    expect(fromUtc.toISOString()).toBe("2026-04-18T15:00:00.000Z");
    expect(toUtc.toISOString()).toBe("2026-04-19T15:00:00.000Z");
  });

  it("produces exactly 24h spacing", () => {
    const { fromUtc, toUtc } = jstDayBoundsUtc("2026-12-31");
    expect(toUtc.getTime() - fromUtc.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});
