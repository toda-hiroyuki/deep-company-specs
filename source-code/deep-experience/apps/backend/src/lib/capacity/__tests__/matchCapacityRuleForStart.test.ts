import { describe, expect, it } from "vitest";
import type { CapacityRule } from "@prisma/client";
import {
  matchCapacityRuleForStart,
  toJstComponents,
} from "../matchCapacityRuleForStart";

function rule(overrides: Partial<CapacityRule> = {}): CapacityRule {
  return {
    id: overrides.id ?? "rule-1",
    tourId: "tour-1",
    ruleType: "WEEKLY",
    daysOfWeek: JSON.stringify([0, 1, 2, 3, 4, 5, 6]),
    startDate: null,
    endDate: null,
    singleDate: null,
    startTimes: JSON.stringify([{ hour: 10, minute: 0 }]),
    capacity: 6,
    minParticipants: 1,
    maxPerBooking: null,
    minPerBooking: 1,
    priority: 0,
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  } as CapacityRule;
}

// 2026-04-19 01:00:00 UTC = 2026-04-19 10:00 JST (Sunday=0)
const jstStart10am = new Date("2026-04-19T01:00:00Z");

describe("toJstComponents", () => {
  it("extracts JST calendar components from a UTC Date", () => {
    expect(toJstComponents(jstStart10am)).toEqual({
      year: 2026,
      month: 4,
      day: 19,
      dayOfWeek: 0, // Sunday
      hour: 10,
      minute: 0,
    });
  });

  it("handles JST midnight crossing from UTC afternoon", () => {
    // 2026-04-18 15:00 UTC = 2026-04-19 00:00 JST
    expect(toJstComponents(new Date("2026-04-18T15:00:00Z"))).toMatchObject({
      year: 2026,
      month: 4,
      day: 19,
      hour: 0,
      minute: 0,
    });
  });
});

describe("matchCapacityRuleForStart", () => {
  it("returns null when no rules provided", () => {
    expect(
      matchCapacityRuleForStart({ startDateTime: jstStart10am, rules: [] })
    ).toBeNull();
  });

  it("returns null when WEEKLY rule excludes the day-of-week", () => {
    const weekdayRule = rule({
      daysOfWeek: JSON.stringify([1, 2, 3, 4, 5]), // Mon-Fri
    });
    expect(
      matchCapacityRuleForStart({
        startDateTime: jstStart10am, // Sunday
        rules: [weekdayRule],
      })
    ).toBeNull();
  });

  it("matches WEEKLY rule on the included day-of-week and startTime", () => {
    const weekendRule = rule({
      id: "weekend",
      daysOfWeek: JSON.stringify([0, 6]),
    });
    expect(
      matchCapacityRuleForStart({
        startDateTime: jstStart10am,
        rules: [weekendRule],
      })?.id
    ).toBe("weekend");
  });

  it("skips rules whose startTimes don't include the JST hour:minute", () => {
    const noon = rule({
      startTimes: JSON.stringify([{ hour: 12, minute: 0 }]),
    });
    expect(
      matchCapacityRuleForStart({ startDateTime: jstStart10am, rules: [noon] })
    ).toBeNull();
  });

  it("picks the highest-priority matching rule", () => {
    const low = rule({ id: "low", priority: 1 });
    const high = rule({ id: "high", priority: 9 });
    expect(
      matchCapacityRuleForStart({
        startDateTime: jstStart10am,
        rules: [low, high],
      })?.id
    ).toBe("high");
  });

  it("ignores inactive rules", () => {
    const inactive = rule({ id: "off", priority: 9, isActive: false });
    const active = rule({ id: "on", priority: 1 });
    expect(
      matchCapacityRuleForStart({
        startDateTime: jstStart10am,
        rules: [inactive, active],
      })?.id
    ).toBe("on");
  });

  it("matches SINGLE rule on matching date", () => {
    const single = rule({
      ruleType: "SINGLE",
      daysOfWeek: JSON.stringify([]),
      singleDate: new Date("2026-04-19T00:00:00Z"),
    });
    expect(
      matchCapacityRuleForStart({
        startDateTime: jstStart10am,
        rules: [single],
      })?.id
    ).toBe("rule-1");
  });

  it("matches YEARLY rule ignoring the year", () => {
    const yearly = rule({
      ruleType: "YEARLY",
      daysOfWeek: JSON.stringify([]),
      startDate: new Date("2020-04-19T00:00:00Z"),
    });
    expect(
      matchCapacityRuleForStart({
        startDateTime: jstStart10am,
        rules: [yearly],
      })?.id
    ).toBe("rule-1");
  });

  it("matches RANGE rule within startDate/endDate on matching dayOfWeek", () => {
    const range = rule({
      ruleType: "RANGE",
      daysOfWeek: JSON.stringify([0]),
      startDate: new Date("2026-04-01T00:00:00Z"),
      endDate: new Date("2026-04-30T00:00:00Z"),
    });
    expect(
      matchCapacityRuleForStart({
        startDateTime: jstStart10am,
        rules: [range],
      })?.id
    ).toBe("rule-1");
  });

  it("returns null when RANGE rule is outside the date window", () => {
    const range = rule({
      ruleType: "RANGE",
      daysOfWeek: JSON.stringify([0]),
      startDate: new Date("2026-05-01T00:00:00Z"),
      endDate: new Date("2026-05-31T00:00:00Z"),
    });
    expect(
      matchCapacityRuleForStart({
        startDateTime: jstStart10am,
        rules: [range],
      })
    ).toBeNull();
  });
});
