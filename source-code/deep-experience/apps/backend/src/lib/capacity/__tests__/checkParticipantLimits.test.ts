import { describe, expect, it } from "vitest";
import { checkParticipantLimits } from "../checkParticipantLimits";
import type { AssessmentContext, CapacityRuleSettings } from "../types";

const rule = (
  overrides: Partial<CapacityRuleSettings> = {}
): CapacityRuleSettings => ({
  id: "r1",
  minParticipants: 1,
  maxPerBooking: null,
  minPerBooking: 1,
  priority: 0,
  isActive: true,
  ...overrides,
});

const baseCtx = (overrides: Partial<AssessmentContext> = {}): AssessmentContext => ({
  tour: {
    maxParticipants: 8,
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
    isNewDeparture: true,
  },
  ...overrides,
});

describe("checkParticipantLimits — Tour.maxParticipants (always enforced)", () => {
  it("passes at the exact cap", () => {
    const ctx = baseCtx({
      tour: { ...baseCtx().tour, maxParticipants: 8 },
      input: { ...baseCtx().input, requestedGuests: 8 },
    });
    expect(checkParticipantLimits(ctx)).toEqual({ ok: true });
  });

  it("rejects with MAX_PARTICIPANTS_EXCEEDED when requested alone exceeds the cap (new departure)", () => {
    const ctx = baseCtx({
      tour: { ...baseCtx().tour, maxParticipants: 8 },
      input: { ...baseCtx().input, requestedGuests: 9 },
    });
    expect(checkParticipantLimits(ctx)).toEqual({
      ok: false,
      reason: "MAX_PARTICIPANTS_EXCEEDED",
    });
  });

  it("rejects when current + requested exceeds the cap on an existing schedule", () => {
    const ctx = baseCtx({
      tour: { ...baseCtx().tour, maxParticipants: 8 },
      schedule: {
        scheduleId: "s1",
        remainingCapacity: 5,
        currentGuests: 7,
        sourceRuleId: null,
      },
      input: { ...baseCtx().input, requestedGuests: 2, isNewDeparture: false },
    });
    expect(checkParticipantLimits(ctx)).toEqual({
      ok: false,
      reason: "MAX_PARTICIPANTS_EXCEEDED",
    });
  });

  it("still enforces Tour.maxParticipants when CapacityRule is null", () => {
    const ctx = baseCtx({
      tour: { ...baseCtx().tour, maxParticipants: 4 },
      applicableRule: null,
      input: { ...baseCtx().input, requestedGuests: 5 },
    });
    expect(checkParticipantLimits(ctx)).toEqual({
      ok: false,
      reason: "MAX_PARTICIPANTS_EXCEEDED",
    });
  });
});

describe("checkParticipantLimits — CapacityRule-derived constraints", () => {
  it("rejects with MAX_PARTICIPANTS_EXCEEDED when requested exceeds rule.maxPerBooking", () => {
    const ctx = baseCtx({
      applicableRule: rule({ maxPerBooking: 4 }),
      input: { ...baseCtx().input, requestedGuests: 5 },
    });
    expect(checkParticipantLimits(ctx)).toEqual({
      ok: false,
      reason: "MAX_PARTICIPANTS_EXCEEDED",
    });
  });

  it("rejects with MIN_PARTICIPANTS_NOT_MET when requested is below rule.minPerBooking", () => {
    const ctx = baseCtx({
      applicableRule: rule({ minPerBooking: 3 }),
      input: { ...baseCtx().input, requestedGuests: 2 },
    });
    expect(checkParticipantLimits(ctx)).toEqual({
      ok: false,
      reason: "MIN_PARTICIPANTS_NOT_MET",
    });
  });

  it("rejects with MIN_PARTICIPANTS_NOT_MET when totalAfter is below rule.minParticipants (departure-wide)", () => {
    const ctx = baseCtx({
      applicableRule: rule({ minParticipants: 4, minPerBooking: 1 }),
      schedule: {
        scheduleId: "s1",
        remainingCapacity: 5,
        currentGuests: 1,
        sourceRuleId: null,
      },
      input: { ...baseCtx().input, requestedGuests: 2, isNewDeparture: false },
    });
    // current 1 + requested 2 = 3 < minParticipants 4
    expect(checkParticipantLimits(ctx)).toEqual({
      ok: false,
      reason: "MIN_PARTICIPANTS_NOT_MET",
    });
  });

  it("passes when all rule constraints are satisfied", () => {
    const ctx = baseCtx({
      applicableRule: rule({
        minParticipants: 2,
        maxPerBooking: 6,
        minPerBooking: 1,
      }),
      input: { ...baseCtx().input, requestedGuests: 3 },
    });
    expect(checkParticipantLimits(ctx)).toEqual({ ok: true });
  });

  it("ignores null maxPerBooking (unbounded upper)", () => {
    const ctx = baseCtx({
      tour: { ...baseCtx().tour, maxParticipants: 20 },
      applicableRule: rule({ maxPerBooking: null, minPerBooking: 1, minParticipants: 1 }),
      input: { ...baseCtx().input, requestedGuests: 15 },
    });
    expect(checkParticipantLimits(ctx)).toEqual({ ok: true });
  });
});
