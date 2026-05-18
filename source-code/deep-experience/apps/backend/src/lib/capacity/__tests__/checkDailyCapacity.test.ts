import { describe, expect, it } from "vitest";
import { checkDailyCapacity } from "../checkDailyCapacity";
import type { AssessmentContext } from "../types";

const baseCtx = (overrides: Partial<AssessmentContext> = {}): AssessmentContext => ({
  tour: {
    maxParticipants: 100,
    dailyCapacity: 10,
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

describe("checkDailyCapacity", () => {
  it("passes when dailyCapacity is null (no daily limit)", () => {
    const ctx = baseCtx({
      tour: { ...baseCtx().tour, dailyCapacity: null },
      daily: { dateKey: "2026-04-19", bookedGuests: 999, departureCount: 99 },
      input: { ...baseCtx().input, requestedGuests: 999 },
    });
    expect(checkDailyCapacity(ctx)).toEqual({ ok: true });
  });

  it("passes when total equals dailyCapacity exactly", () => {
    const ctx = baseCtx({
      tour: { ...baseCtx().tour, dailyCapacity: 10 },
      daily: { dateKey: "2026-04-19", bookedGuests: 8, departureCount: 2 },
      input: { ...baseCtx().input, requestedGuests: 2 },
    });
    expect(checkDailyCapacity(ctx)).toEqual({ ok: true });
  });

  it("rejects with DAILY_CAPACITY_EXCEEDED when total exceeds dailyCapacity by 1", () => {
    const ctx = baseCtx({
      tour: { ...baseCtx().tour, dailyCapacity: 10 },
      daily: { dateKey: "2026-04-19", bookedGuests: 8, departureCount: 2 },
      input: { ...baseCtx().input, requestedGuests: 3 },
    });
    expect(checkDailyCapacity(ctx)).toEqual({
      ok: false,
      reason: "DAILY_CAPACITY_EXCEEDED",
    });
  });

  it("passes when dailyCapacity is 0 and requestedGuests is 0 (edge: unreachable in practice but logic-safe)", () => {
    // requestedGuests = 0 is rejected by zod at the orchestrator layer,
    // but the pure function treats 0 + 0 <= 0 as ok.
    const ctx = baseCtx({
      tour: { ...baseCtx().tour, dailyCapacity: 0 },
      daily: { dateKey: "2026-04-19", bookedGuests: 0, departureCount: 0 },
      input: { ...baseCtx().input, requestedGuests: 0 },
    });
    expect(checkDailyCapacity(ctx)).toEqual({ ok: true });
  });
});
