import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AssessmentContext, AssessmentInput } from "../types";

// Mock fetchContext so orchestrator tests don't hit Prisma.
vi.mock("../fetchContext", () => ({
  fetchContext: vi.fn(),
}));

import { assessBookingAcceptance } from "../assessBookingAcceptance";
import { fetchContext } from "../fetchContext";

const mockedFetch = vi.mocked(fetchContext);

const okCtx = (overrides: Partial<AssessmentContext> = {}): AssessmentContext => ({
  tour: {
    maxParticipants: 100,
    dailyCapacity: null,
    maxDeparturesPerDay: null,
    bookingCutoffMinutes: null,
  },
  applicableRule: null,
  schedule: null,
  daily: { dateKey: "2026-04-19", bookedGuests: 0, departureCount: 0 },
  closeOut: { isClosed: false },
  now: new Date("2026-04-19T00:00:00Z"),
  input: {
    tourId: "tour-1",
    startDateTime: new Date("2026-04-20T01:00:00Z"),
    requestedGuests: 2,
    isNewDeparture: true,
  },
  ...overrides,
});

const validInput: AssessmentInput = {
  tourId: "tour-1",
  startDateTime: new Date("2026-04-20T01:00:00Z"),
  requestedGuests: 2,
  isNewDeparture: true,
  now: new Date("2026-04-19T00:00:00Z"),
};

beforeEach(() => {
  mockedFetch.mockReset();
});

describe("assessBookingAcceptance — input validation", () => {
  it("throws when scheduleId is omitted and isNewDeparture=false (contradictory state)", async () => {
    await expect(
      assessBookingAcceptance({
        tourId: "tour-1",
        startDateTime: new Date("2026-04-20T01:00:00Z"),
        requestedGuests: 2,
        isNewDeparture: false,
      })
    ).rejects.toThrow();
  });

  it("throws on non-positive requestedGuests", async () => {
    await expect(
      assessBookingAcceptance({
        tourId: "tour-1",
        startDateTime: new Date("2026-04-20T01:00:00Z"),
        requestedGuests: 0,
        isNewDeparture: true,
      })
    ).rejects.toThrow();
  });
});

describe("assessBookingAcceptance — evaluation order", () => {
  it("returns TIME_SLOT_FULL first when schedule capacity is exceeded (item 1)", async () => {
    mockedFetch.mockResolvedValueOnce(
      okCtx({
        schedule: {
          scheduleId: "s1",
          remainingCapacity: 1,
          currentGuests: 5,
          sourceRuleId: null,
        },
        // daily would also fail, but item 1 should win
        tour: {
          maxParticipants: 100,
          dailyCapacity: 0,
          maxDeparturesPerDay: null,
          bookingCutoffMinutes: null,
        },
        input: { ...validInput, scheduleId: "s1", isNewDeparture: false, requestedGuests: 3 },
      })
    );
    const r = await assessBookingAcceptance({
      ...validInput,
      scheduleId: "s1",
      isNewDeparture: false,
      requestedGuests: 3,
    });
    expect(r).toEqual({ ok: false, reason: "TIME_SLOT_FULL" });
  });

  it("returns DAILY_CAPACITY_EXCEEDED before departures/participants checks (item 2)", async () => {
    mockedFetch.mockResolvedValueOnce(
      okCtx({
        tour: {
          maxParticipants: 100,
          dailyCapacity: 5,
          maxDeparturesPerDay: 1, // would fail too
          bookingCutoffMinutes: null,
        },
        daily: { dateKey: "2026-04-19", bookedGuests: 5, departureCount: 1 },
      })
    );
    const r = await assessBookingAcceptance(validInput);
    expect(r).toEqual({ ok: false, reason: "DAILY_CAPACITY_EXCEEDED" });
  });

  it("returns MAX_DEPARTURES_EXCEEDED before participants/cutoff (item 3)", async () => {
    mockedFetch.mockResolvedValueOnce(
      okCtx({
        tour: {
          maxParticipants: 100,
          dailyCapacity: null,
          maxDeparturesPerDay: 2,
          bookingCutoffMinutes: 9999, // cutoff would also fail
        },
        daily: { dateKey: "2026-04-19", bookedGuests: 0, departureCount: 2 },
      })
    );
    const r = await assessBookingAcceptance(validInput);
    expect(r).toEqual({ ok: false, reason: "MAX_DEPARTURES_EXCEEDED" });
  });

  it("returns MAX_PARTICIPANTS_EXCEEDED before cutoff (item 4)", async () => {
    mockedFetch.mockResolvedValueOnce(
      okCtx({
        tour: {
          maxParticipants: 1,
          dailyCapacity: null,
          maxDeparturesPerDay: null,
          bookingCutoffMinutes: 9999,
        },
        input: { ...validInput, requestedGuests: 5 },
      })
    );
    const r = await assessBookingAcceptance({ ...validInput, requestedGuests: 5 });
    expect(r).toEqual({ ok: false, reason: "MAX_PARTICIPANTS_EXCEEDED" });
  });

  it("returns BOOKING_CUTOFF_EXCEEDED when only item 5 fails", async () => {
    mockedFetch.mockResolvedValueOnce(
      okCtx({
        tour: {
          maxParticipants: 100,
          dailyCapacity: null,
          maxDeparturesPerDay: null,
          bookingCutoffMinutes: 120,
        },
        now: new Date("2026-04-20T00:00:00Z"), // 1h before departure
        input: {
          ...validInput,
          startDateTime: new Date("2026-04-20T01:00:00Z"),
          now: new Date("2026-04-20T00:00:00Z"),
        },
      })
    );
    const r = await assessBookingAcceptance({
      ...validInput,
      now: new Date("2026-04-20T00:00:00Z"),
    });
    expect(r).toEqual({ ok: false, reason: "BOOKING_CUTOFF_EXCEEDED" });
  });

  it("returns { ok: true } when every check passes", async () => {
    mockedFetch.mockResolvedValueOnce(okCtx());
    const r = await assessBookingAcceptance(validInput);
    expect(r).toEqual({ ok: true });
  });
});
