import { describe, expect, it } from "vitest";
import { checkDeparturesPerDay } from "../checkDeparturesPerDay";
import type { AssessmentContext } from "../types";

const baseCtx = (overrides: Partial<AssessmentContext> = {}): AssessmentContext => ({
  tour: {
    maxParticipants: 100,
    dailyCapacity: null,
    maxDeparturesPerDay: 3,
    bookingCutoffMinutes: null,
  },
  applicableRule: null,
  schedule: null,
  closeOut: { isClosed: false },
  daily: { dateKey: "2026-04-19", bookedGuests: 0, departureCount: 2 },
  now: new Date("2026-04-19T00:00:00Z"),
  input: {
    tourId: "tour-1",
    startDateTime: new Date("2026-04-20T01:00:00Z"),
    requestedGuests: 2,
    isNewDeparture: true,
  },
  ...overrides,
});

describe("checkDeparturesPerDay", () => {
  it("skips when isNewDeparture=false (existing schedule consumes no new slot)", () => {
    const ctx = baseCtx({
      input: { ...baseCtx().input, isNewDeparture: false },
      daily: { dateKey: "2026-04-19", bookedGuests: 0, departureCount: 99 },
    });
    expect(checkDeparturesPerDay(ctx)).toEqual({ ok: true });
  });

  it("passes when maxDeparturesPerDay is null", () => {
    const ctx = baseCtx({
      tour: { ...baseCtx().tour, maxDeparturesPerDay: null },
      daily: { dateKey: "2026-04-19", bookedGuests: 0, departureCount: 99 },
    });
    expect(checkDeparturesPerDay(ctx)).toEqual({ ok: true });
  });

  it("passes when adding the new departure equals the limit exactly", () => {
    const ctx = baseCtx({
      tour: { ...baseCtx().tour, maxDeparturesPerDay: 3 },
      daily: { dateKey: "2026-04-19", bookedGuests: 0, departureCount: 2 },
    });
    expect(checkDeparturesPerDay(ctx)).toEqual({ ok: true });
  });

  it("rejects with MAX_DEPARTURES_EXCEEDED when adding the new departure would exceed the limit", () => {
    const ctx = baseCtx({
      tour: { ...baseCtx().tour, maxDeparturesPerDay: 3 },
      daily: { dateKey: "2026-04-19", bookedGuests: 0, departureCount: 3 },
    });
    expect(checkDeparturesPerDay(ctx)).toEqual({
      ok: false,
      reason: "MAX_DEPARTURES_EXCEEDED",
    });
  });
});
