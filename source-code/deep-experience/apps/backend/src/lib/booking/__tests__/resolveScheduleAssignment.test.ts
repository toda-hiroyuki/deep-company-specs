import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock is hoisted; pull shared mock fns through vi.hoisted so the factory
// and the tests reference the same vi.fn() instances.
const { prismaMock, assessMock, matchMock } = vi.hoisted(() => {
  return {
    prismaMock: {
      tour: { findUnique: vi.fn() },
      tourSchedule: { findMany: vi.fn() },
      booking: { findFirst: vi.fn() },
    },
    assessMock: vi.fn(),
    matchMock: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/capacity", () => ({
  assessBookingAcceptance: assessMock,
  matchCapacityRuleForStart: matchMock,
}));

import {
  resolveScheduleAssignment,
  TourNotAvailableError,
  resolveInitialCapacity,
  normalizeToMinutePrecision,
} from "../resolveScheduleAssignment";
import { PrivateScheduleAlreadyBookedError } from "../errors";

function tour(overrides: Record<string, unknown> = {}) {
  return {
    id: "tour-1",
    tourType: "GROUP",
    durationMinutes: 60,
    maxParticipants: 10,
    isActive: true,
    capacityRules: [],
    ...overrides,
  };
}

const start = new Date("2026-04-19T01:00:00Z");

beforeEach(() => {
  prismaMock.tour.findUnique.mockReset();
  prismaMock.tourSchedule.findMany.mockReset();
  prismaMock.booking.findFirst.mockReset();
  assessMock.mockReset();
  matchMock.mockReset();
});

describe("normalizeToMinutePrecision", () => {
  it("zeroes seconds and milliseconds", () => {
    const d = normalizeToMinutePrecision(new Date("2026-04-19T01:00:42.500Z"));
    expect(d.getUTCSeconds()).toBe(0);
    expect(d.getUTCMilliseconds()).toBe(0);
    expect(d.toISOString()).toBe("2026-04-19T01:00:00.000Z");
  });
});

describe("resolveInitialCapacity", () => {
  it("prefers CapacityRule.capacity when present", () => {
    expect(
      resolveInitialCapacity(
        // @ts-expect-error — partial rule shape is enough for this function
        { capacity: 8 },
        { maxParticipants: 999 }
      )
    ).toBe(8);
  });

  it("falls back to Tour.maxParticipants when rule is null", () => {
    expect(resolveInitialCapacity(null, { maxParticipants: 12 })).toBe(12);
  });

  it("falls back to 6 when both are absent/zero", () => {
    expect(resolveInitialCapacity(null, { maxParticipants: 0 })).toBe(6);
  });
});

describe("resolveScheduleAssignment — GROUP flow", () => {
  it("uses an existing schedule when acceptance passes", async () => {
    prismaMock.tour.findUnique.mockResolvedValueOnce(tour());
    prismaMock.tourSchedule.findMany.mockResolvedValueOnce([
      { id: "s1", capacity: 5, status: "OPEN", sourceRuleId: null },
    ]);
    assessMock.mockResolvedValueOnce({ ok: true });

    const result = await resolveScheduleAssignment({
      tourId: "tour-1",
      requestedStartDateTime: start,
      requestedGuests: 2,
    });

    expect(result).toEqual({
      ok: true,
      plan: {
        mode: "EXISTING",
        scheduleId: "s1",
        currentCapacity: 5,
        tourType: "GROUP",
      },
    });
    expect(assessMock).toHaveBeenCalledTimes(1);
  });

  it("creates a new schedule when the matched schedule is rejected and new-departure is OK", async () => {
    prismaMock.tour.findUnique.mockResolvedValueOnce(
      tour({ durationMinutes: 90 })
    );
    prismaMock.tourSchedule.findMany.mockResolvedValueOnce([
      { id: "s1", capacity: 0, status: "FULL", sourceRuleId: null },
    ]);
    // Existing fails, new departure OK.
    assessMock
      .mockResolvedValueOnce({ ok: false, reason: "TIME_SLOT_FULL" })
      .mockResolvedValueOnce({ ok: true });
    matchMock.mockReturnValueOnce({ id: "rule-1", capacity: 8 });

    const result = await resolveScheduleAssignment({
      tourId: "tour-1",
      requestedStartDateTime: start,
      requestedGuests: 3,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan).toMatchObject({
      mode: "NEW",
      initialCapacity: 8,
      sourceRuleId: "rule-1",
    });
    if (result.plan.mode !== "NEW") return;
    expect(result.plan.endDateTime.getTime() - result.plan.normalizedStartDateTime.getTime()).toBe(90 * 60 * 1000);
  });

  it("picks the first passing schedule across multiple candidates", async () => {
    prismaMock.tour.findUnique.mockResolvedValueOnce(tour());
    prismaMock.tourSchedule.findMany.mockResolvedValueOnce([
      { id: "full", capacity: 0, status: "FULL", sourceRuleId: null },
      { id: "open", capacity: 4, status: "OPEN", sourceRuleId: null },
    ]);
    assessMock
      .mockResolvedValueOnce({ ok: false, reason: "TIME_SLOT_FULL" })
      .mockResolvedValueOnce({ ok: true });

    const result = await resolveScheduleAssignment({
      tourId: "tour-1",
      requestedStartDateTime: start,
      requestedGuests: 2,
    });

    expect(result).toMatchObject({
      ok: true,
      plan: { mode: "EXISTING", scheduleId: "open" },
    });
  });

  it("rejects with MAX_DEPARTURES_EXCEEDED when no existing candidate fits and new-departure is blocked", async () => {
    prismaMock.tour.findUnique.mockResolvedValueOnce(tour());
    prismaMock.tourSchedule.findMany.mockResolvedValueOnce([]);
    assessMock.mockResolvedValueOnce({
      ok: false,
      reason: "MAX_DEPARTURES_EXCEEDED",
    });

    const result = await resolveScheduleAssignment({
      tourId: "tour-1",
      requestedStartDateTime: start,
      requestedGuests: 2,
    });

    expect(result).toEqual({ ok: false, reason: "MAX_DEPARTURES_EXCEEDED" });
  });

  it("falls back to Tour.maxParticipants when no CapacityRule matches", async () => {
    prismaMock.tour.findUnique.mockResolvedValueOnce(
      tour({ maxParticipants: 9 })
    );
    prismaMock.tourSchedule.findMany.mockResolvedValueOnce([]);
    assessMock.mockResolvedValueOnce({ ok: true });
    matchMock.mockReturnValueOnce(null);

    const result = await resolveScheduleAssignment({
      tourId: "tour-1",
      requestedStartDateTime: start,
      requestedGuests: 2,
    });

    expect(result).toMatchObject({
      ok: true,
      plan: { mode: "NEW", initialCapacity: 9, sourceRuleId: null },
    });
  });

  it("rejects MAX_PARTICIPANTS_EXCEEDED when requestedGuests exceeds initialCapacity", async () => {
    prismaMock.tour.findUnique.mockResolvedValueOnce(
      tour({ maxParticipants: 2 })
    );
    prismaMock.tourSchedule.findMany.mockResolvedValueOnce([]);
    assessMock.mockResolvedValueOnce({ ok: true });
    matchMock.mockReturnValueOnce({ id: "rule", capacity: 2 });

    const result = await resolveScheduleAssignment({
      tourId: "tour-1",
      requestedStartDateTime: start,
      requestedGuests: 5,
    });

    expect(result).toEqual({
      ok: false,
      reason: "MAX_PARTICIPANTS_EXCEEDED",
    });
  });
});

describe("resolveScheduleAssignment — PRIVATE flow", () => {
  it("rejects when a matched PRIVATE schedule already has an occupying booking", async () => {
    prismaMock.tour.findUnique.mockResolvedValueOnce(tour({ tourType: "PRIVATE" }));
    prismaMock.tourSchedule.findMany.mockResolvedValueOnce([
      { id: "s1", capacity: 0, status: "FULL", sourceRuleId: null },
    ]);
    prismaMock.booking.findFirst.mockResolvedValueOnce({
      id: "b1",
      tourScheduleId: "s1",
    });

    await expect(
      resolveScheduleAssignment({
        tourId: "tour-1",
        requestedStartDateTime: start,
        requestedGuests: 1,
      })
    ).rejects.toBeInstanceOf(PrivateScheduleAlreadyBookedError);
  });

  it("creates a new schedule when PRIVATE has no matched schedule", async () => {
    prismaMock.tour.findUnique.mockResolvedValueOnce(tour({ tourType: "PRIVATE" }));
    prismaMock.tourSchedule.findMany.mockResolvedValueOnce([]);
    assessMock.mockResolvedValueOnce({ ok: true });
    matchMock.mockReturnValueOnce({ id: "rule-priv", capacity: 1 });

    const result = await resolveScheduleAssignment({
      tourId: "tour-1",
      requestedStartDateTime: start,
      requestedGuests: 1,
    });

    expect(result).toMatchObject({
      ok: true,
      plan: { mode: "NEW", sourceRuleId: "rule-priv", initialCapacity: 1 },
    });
  });
});

describe("resolveScheduleAssignment — DEPARTURE_FINALIZED guard", () => {
  it("rejects NEW schedule spawn after the free-cancellation deadline", async () => {
    const pastDeparture = new Date("2026-04-19T01:00:00Z");
    const nowPastDeadline = new Date("2026-04-19T00:30:00Z"); // 30min before start, 24h cutoff means deadline passed
    prismaMock.tour.findUnique.mockResolvedValueOnce(
      tour({ freeCancellationDeadlineHours: 24 })
    );
    prismaMock.tourSchedule.findMany.mockResolvedValueOnce([]);
    // assessMock should not be reached for NEW path gating, but keep a permissive default
    assessMock.mockResolvedValue({ ok: true });

    const result = await resolveScheduleAssignment({
      tourId: "tour-1",
      requestedStartDateTime: pastDeparture,
      requestedGuests: 1,
      now: nowPastDeadline,
    });

    expect(result).toEqual({ ok: false, reason: "DEPARTURE_FINALIZED" });
  });

  it("allows EXISTING schedule booking past the deadline (gate only on new spawn)", async () => {
    const pastDeparture = new Date("2026-04-19T01:00:00Z");
    const nowPastDeadline = new Date("2026-04-19T00:30:00Z");
    prismaMock.tour.findUnique.mockResolvedValueOnce(
      tour({ freeCancellationDeadlineHours: 24 })
    );
    prismaMock.tourSchedule.findMany.mockResolvedValueOnce([
      { id: "s-existing", capacity: 5, status: "OPEN", sourceRuleId: null },
    ]);
    assessMock.mockResolvedValueOnce({ ok: true });

    const result = await resolveScheduleAssignment({
      tourId: "tour-1",
      requestedStartDateTime: pastDeparture,
      requestedGuests: 1,
      now: nowPastDeadline,
    });

    expect(result).toMatchObject({
      ok: true,
      plan: { mode: "EXISTING", scheduleId: "s-existing" },
    });
  });
});

describe("resolveScheduleAssignment — errors", () => {
  it("throws TourNotAvailableError when the tour is missing", async () => {
    prismaMock.tour.findUnique.mockResolvedValueOnce(null);
    await expect(
      resolveScheduleAssignment({
        tourId: "tour-missing",
        requestedStartDateTime: start,
        requestedGuests: 1,
      })
    ).rejects.toBeInstanceOf(TourNotAvailableError);
  });

  it("throws TourNotAvailableError when the tour is inactive", async () => {
    prismaMock.tour.findUnique.mockResolvedValueOnce(tour({ isActive: false }));
    await expect(
      resolveScheduleAssignment({
        tourId: "tour-1",
        requestedStartDateTime: start,
        requestedGuests: 1,
      })
    ).rejects.toBeInstanceOf(TourNotAvailableError);
  });

  it("throws when requestedGuests is not a positive integer", async () => {
    await expect(
      resolveScheduleAssignment({
        tourId: "tour-1",
        requestedStartDateTime: start,
        requestedGuests: 0,
      })
    ).rejects.toThrow();
  });
});
