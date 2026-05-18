import { describe, expect, it } from "vitest";
import { checkScheduleCapacity } from "../checkScheduleCapacity";
import type { AssessmentContext } from "../types";

const baseCtx = (overrides: Partial<AssessmentContext> = {}): AssessmentContext => ({
  tour: {
    maxParticipants: 100,
    dailyCapacity: null,
    maxDeparturesPerDay: null,
    bookingCutoffMinutes: null,
  },
  applicableRule: null,
  schedule: null,
  closeOut: { isClosed: false },
  daily: { dateKey: "2026-04-19", bookedGuests: 0, departureCount: 0 },
  now: new Date("2026-04-19T00:00:00Z"),
  input: {
    tourId: "tour-1",
    startDateTime: new Date("2026-04-20T01:00:00Z"),
    requestedGuests: 2,
    isNewDeparture: false,
  },
  ...overrides,
});

describe("checkScheduleCapacity", () => {
  it("passes when no schedule is attached (new-departure path)", () => {
    const ctx = baseCtx({
      schedule: null,
      input: {
        ...baseCtx().input,
        isNewDeparture: true,
        requestedGuests: 999,
      },
    });
    expect(checkScheduleCapacity(ctx)).toEqual({ ok: true });
  });

  it("passes when requested guests fit within remaining capacity", () => {
    const ctx = baseCtx({
      schedule: {
        scheduleId: "s1",
        remainingCapacity: 5,
        currentGuests: 3,
        sourceRuleId: null,
      },
      input: { ...baseCtx().input, requestedGuests: 5 },
    });
    expect(checkScheduleCapacity(ctx)).toEqual({ ok: true });
  });

  it("rejects with TIME_SLOT_FULL when requested guests exceed remaining capacity", () => {
    const ctx = baseCtx({
      schedule: {
        scheduleId: "s1",
        remainingCapacity: 2,
        currentGuests: 6,
        sourceRuleId: null,
      },
      input: { ...baseCtx().input, requestedGuests: 3 },
    });
    expect(checkScheduleCapacity(ctx)).toEqual({
      ok: false,
      reason: "TIME_SLOT_FULL",
    });
  });

  it("rejects when remainingCapacity is 0", () => {
    const ctx = baseCtx({
      schedule: {
        scheduleId: "s1",
        remainingCapacity: 0,
        currentGuests: 8,
        sourceRuleId: null,
      },
      input: { ...baseCtx().input, requestedGuests: 1 },
    });
    expect(checkScheduleCapacity(ctx)).toEqual({
      ok: false,
      reason: "TIME_SLOT_FULL",
    });
  });
});
