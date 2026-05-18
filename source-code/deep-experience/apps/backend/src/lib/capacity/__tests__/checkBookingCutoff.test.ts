import { describe, expect, it } from "vitest";
import {
  checkBookingCutoff,
  isBookingCutoffExceeded,
} from "../checkBookingCutoff";
import type { AssessmentContext } from "../types";

const baseCtx = (overrides: Partial<AssessmentContext> = {}): AssessmentContext => ({
  tour: {
    maxParticipants: 100,
    dailyCapacity: null,
    maxDeparturesPerDay: null,
    bookingCutoffMinutes: 120, // 2h before departure
  },
  applicableRule: null,
  schedule: null,
  closeOut: { isClosed: false },
  daily: { dateKey: "2026-04-19", bookedGuests: 0, departureCount: 0 },
  now: new Date("2026-04-19T10:00:00Z"),
  input: {
    tourId: "tour-1",
    startDateTime: new Date("2026-04-19T13:00:00Z"), // 3h ahead
    requestedGuests: 2,
    isNewDeparture: false,
  },
  ...overrides,
});

describe("checkBookingCutoff", () => {
  it("passes when bookingCutoffMinutes is null (no cutoff)", () => {
    const ctx = baseCtx({
      tour: { ...baseCtx().tour, bookingCutoffMinutes: null },
      now: new Date("2026-04-19T12:59:00Z"), // just before departure
    });
    expect(checkBookingCutoff(ctx)).toEqual({ ok: true });
  });

  it("passes when diff equals cutoff exactly", () => {
    const ctx = baseCtx({
      tour: { ...baseCtx().tour, bookingCutoffMinutes: 120 },
      now: new Date("2026-04-19T11:00:00Z"), // 2h before
    });
    expect(checkBookingCutoff(ctx)).toEqual({ ok: true });
  });

  it("rejects with BOOKING_CUTOFF_EXCEEDED when diff is under the cutoff", () => {
    const ctx = baseCtx({
      tour: { ...baseCtx().tour, bookingCutoffMinutes: 120 },
      now: new Date("2026-04-19T11:01:00Z"), // 1h59m before
    });
    expect(checkBookingCutoff(ctx)).toEqual({
      ok: false,
      reason: "BOOKING_CUTOFF_EXCEEDED",
    });
  });

  it("passes with bookingCutoffMinutes=0 right up to the moment of departure", () => {
    const ctx = baseCtx({
      tour: { ...baseCtx().tour, bookingCutoffMinutes: 0 },
      now: new Date("2026-04-19T13:00:00Z"),
    });
    expect(checkBookingCutoff(ctx)).toEqual({ ok: true });
  });

  it("rejects past-departure bookings even with bookingCutoffMinutes=0", () => {
    const ctx = baseCtx({
      tour: { ...baseCtx().tour, bookingCutoffMinutes: 0 },
      now: new Date("2026-04-19T13:00:01Z"), // 1 second past departure
    });
    expect(checkBookingCutoff(ctx)).toEqual({
      ok: false,
      reason: "BOOKING_CUTOFF_EXCEEDED",
    });
  });
});

describe("isBookingCutoffExceeded", () => {
  const start = new Date("2026-04-19T13:00:00Z");

  it("returns false when bookingCutoffMinutes is null", () => {
    expect(
      isBookingCutoffExceeded({
        startDateTime: start,
        bookingCutoffMinutes: null,
        now: new Date("2026-04-19T12:59:00Z"),
      })
    ).toBe(false);
  });

  it("returns false when diff equals cutoff exactly (equality is still open)", () => {
    expect(
      isBookingCutoffExceeded({
        startDateTime: start,
        bookingCutoffMinutes: 120,
        now: new Date("2026-04-19T11:00:00Z"), // exactly 2h
      })
    ).toBe(false);
  });

  it("returns true when diff is 1 minute under the cutoff", () => {
    expect(
      isBookingCutoffExceeded({
        startDateTime: start,
        bookingCutoffMinutes: 120,
        now: new Date("2026-04-19T11:01:00Z"), // 1h59m
      })
    ).toBe(true);
  });

  it("returns false with bookingCutoffMinutes=0 at the exact moment of departure", () => {
    expect(
      isBookingCutoffExceeded({
        startDateTime: start,
        bookingCutoffMinutes: 0,
        now: start,
      })
    ).toBe(false);
  });

  it("returns true with bookingCutoffMinutes=0 when departure has already passed", () => {
    expect(
      isBookingCutoffExceeded({
        startDateTime: start,
        bookingCutoffMinutes: 0,
        now: new Date("2026-04-19T13:00:01Z"),
      })
    ).toBe(true);
  });
});
