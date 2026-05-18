import { beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock is hoisted; pull mock fns through vi.hoisted so tests and the mock
// factory share the same vi.fn() instances.
const { prismaMock, assessMock, matchMock } = vi.hoisted(() => {
  const txTable = () => ({
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  });
  const tables = {
    booking: txTable(),
    tourSchedule: txTable(),
    tour: txTable(),
  };
  return {
    prismaMock: {
      ...tables,
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(tables)),
    },
    assessMock: vi.fn(),
    matchMock: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/capacity", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/capacity")
  >("@/lib/capacity");
  return {
    ...actual,
    assessBookingAcceptance: assessMock,
    matchCapacityRuleForStart: matchMock,
  };
});

import { reassignBookingSchedule } from "../reassignBookingSchedule";
import { PrivateScheduleAlreadyBookedError } from "../errors";

const OLD_SCHEDULE_ID = "old-sched";
const TARGET_SCHEDULE_ID = "new-sched";
const BOOKING_ID = "booking-1";

function buildBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    tourScheduleId: OLD_SCHEDULE_ID,
    numberOfGuests: 2,
    status: "PENDING",
    assignmentState: "TENTATIVE",
    tourSchedule: {
      id: OLD_SCHEDULE_ID,
      startDateTime: new Date("2026-04-19T01:00:00Z"),
      endDateTime: new Date("2026-04-19T02:00:00Z"),
      tour: {
        id: "tour-1",
        tourType: "GROUP",
        durationMinutes: 60,
        maxParticipants: 10,
        capacityRules: [],
      },
    },
    ...overrides,
  };
}

function resetMocks() {
  prismaMock.booking.findUnique.mockReset();
  prismaMock.booking.findFirst.mockReset();
  prismaMock.booking.update.mockReset();
  prismaMock.tourSchedule.findUnique.mockReset();
  prismaMock.tourSchedule.findUniqueOrThrow.mockReset();
  prismaMock.tourSchedule.findMany.mockReset();
  prismaMock.tourSchedule.update.mockReset();
  prismaMock.tourSchedule.create.mockReset();
  prismaMock.$transaction.mockClear();
  // Default: $transaction simply runs the callback against the same tables mock.
  prismaMock.$transaction.mockImplementation(
    async (fn: (tx: unknown) => unknown) =>
      fn({
        booking: prismaMock.booking,
        tourSchedule: prismaMock.tourSchedule,
        tour: prismaMock.tour,
      })
  );
  assessMock.mockReset();
  matchMock.mockReset();
}

beforeEach(() => {
  resetMocks();
});

describe("reassignBookingSchedule — guards", () => {
  it("returns BOOKING_NOT_FOUND when booking is missing", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(null);
    const result = await reassignBookingSchedule({
      bookingId: BOOKING_ID,
      target: { kind: "EXISTING", scheduleId: TARGET_SCHEDULE_ID },
    });
    expect(result).toEqual({ ok: false, reason: "BOOKING_NOT_FOUND" });
  });

  it("returns BOOKING_FINALIZED when assignmentState is FINALIZED", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({ assignmentState: "FINALIZED" })
    );
    const result = await reassignBookingSchedule({
      bookingId: BOOKING_ID,
      target: { kind: "EXISTING", scheduleId: TARGET_SCHEDULE_ID },
    });
    expect(result).toEqual({ ok: false, reason: "BOOKING_FINALIZED" });
  });

  it("returns BOOKING_NOT_ACTIVE for CANCELLED bookings", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({ status: "CANCELLED" })
    );
    const result = await reassignBookingSchedule({
      bookingId: BOOKING_ID,
      target: { kind: "EXISTING", scheduleId: TARGET_SCHEDULE_ID },
    });
    expect(result).toEqual({ ok: false, reason: "BOOKING_NOT_ACTIVE" });
  });

  it("returns TARGET_SAME_AS_CURRENT when target schedule == current", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(buildBooking());
    const result = await reassignBookingSchedule({
      bookingId: BOOKING_ID,
      target: { kind: "EXISTING", scheduleId: OLD_SCHEDULE_ID },
    });
    expect(result).toEqual({ ok: false, reason: "TARGET_SAME_AS_CURRENT" });
  });

  it("returns SCHEDULE_NOT_FOUND when target schedule is missing", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(buildBooking());
    prismaMock.tourSchedule.findUnique.mockResolvedValueOnce(null);
    const result = await reassignBookingSchedule({
      bookingId: BOOKING_ID,
      target: { kind: "EXISTING", scheduleId: TARGET_SCHEDULE_ID },
    });
    expect(result).toEqual({ ok: false, reason: "SCHEDULE_NOT_FOUND" });
  });

  it("returns TOUR_MISMATCH when target schedule belongs to another tour", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(buildBooking());
    prismaMock.tourSchedule.findUnique.mockResolvedValueOnce({
      id: TARGET_SCHEDULE_ID,
      tourId: "tour-OTHER",
      startDateTime: new Date("2026-04-19T03:00:00Z"),
      endDateTime: new Date("2026-04-19T04:00:00Z"),
      status: "OPEN",
    });
    const result = await reassignBookingSchedule({
      bookingId: BOOKING_ID,
      target: { kind: "EXISTING", scheduleId: TARGET_SCHEDULE_ID },
    });
    expect(result).toEqual({ ok: false, reason: "TOUR_MISMATCH" });
  });

  it("returns TARGET_SCHEDULE_INACTIVE when target is CANCELLED", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(buildBooking());
    prismaMock.tourSchedule.findUnique.mockResolvedValueOnce({
      id: TARGET_SCHEDULE_ID,
      tourId: "tour-1",
      startDateTime: new Date("2026-04-19T03:00:00Z"),
      endDateTime: new Date("2026-04-19T04:00:00Z"),
      status: "CANCELLED",
    });
    const result = await reassignBookingSchedule({
      bookingId: BOOKING_ID,
      target: { kind: "EXISTING", scheduleId: TARGET_SCHEDULE_ID },
    });
    expect(result).toEqual({ ok: false, reason: "TARGET_SCHEDULE_INACTIVE" });
  });
});

describe("reassignBookingSchedule — EXISTING target success", () => {
  it("moves the booking and updates capacities atomically", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(buildBooking());
    prismaMock.tourSchedule.findUnique.mockResolvedValueOnce({
      id: TARGET_SCHEDULE_ID,
      tourId: "tour-1",
      startDateTime: new Date("2026-04-19T03:00:00Z"),
      endDateTime: new Date("2026-04-19T04:00:00Z"),
      status: "OPEN",
    });
    assessMock.mockResolvedValueOnce({ ok: true });
    // tx-internal old schedule fetch
    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      capacity: 8,
      status: "OPEN",
    });
    // tx-internal new schedule fetch
    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      capacity: 5,
    });
    prismaMock.booking.update.mockResolvedValueOnce({
      id: BOOKING_ID,
      tourScheduleId: TARGET_SCHEDULE_ID,
      status: "PENDING",
      assignmentState: "TENTATIVE",
      numberOfGuests: 2,
    });
    // Final fetch returning the new schedule
    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      id: TARGET_SCHEDULE_ID,
      tourId: "tour-1",
      startDateTime: new Date("2026-04-19T03:00:00Z"),
      endDateTime: new Date("2026-04-19T04:00:00Z"),
      capacity: 3,
      status: "OPEN",
      sourceRuleId: null,
    });

    const result = await reassignBookingSchedule({
      bookingId: BOOKING_ID,
      target: { kind: "EXISTING", scheduleId: TARGET_SCHEDULE_ID },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.oldScheduleId).toBe(OLD_SCHEDULE_ID);
    expect(result.newSchedule.id).toBe(TARGET_SCHEDULE_ID);

    // Old schedule: capacity 8 + 2 = 10
    expect(prismaMock.tourSchedule.update).toHaveBeenNthCalledWith(1, {
      where: { id: OLD_SCHEDULE_ID },
      data: { capacity: 10 },
    });
    // New schedule: capacity 5 - 2 = 3
    expect(prismaMock.tourSchedule.update).toHaveBeenNthCalledWith(2, {
      where: { id: TARGET_SCHEDULE_ID },
      data: { capacity: 3, status: "OPEN" },
    });
    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: { id: BOOKING_ID },
      data: { tourScheduleId: TARGET_SCHEDULE_ID },
    });
  });

  it("flips old schedule from FULL to OPEN when capacity recovers", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(buildBooking());
    prismaMock.tourSchedule.findUnique.mockResolvedValueOnce({
      id: TARGET_SCHEDULE_ID,
      tourId: "tour-1",
      startDateTime: new Date("2026-04-19T03:00:00Z"),
      endDateTime: new Date("2026-04-19T04:00:00Z"),
      status: "OPEN",
    });
    assessMock.mockResolvedValueOnce({ ok: true });
    // Old schedule was FULL (capacity 0)
    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      capacity: 0,
      status: "FULL",
    });
    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      capacity: 5,
    });
    prismaMock.booking.update.mockResolvedValueOnce({
      id: BOOKING_ID,
      tourScheduleId: TARGET_SCHEDULE_ID,
      status: "PENDING",
      assignmentState: "TENTATIVE",
      numberOfGuests: 2,
    });
    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      id: TARGET_SCHEDULE_ID,
      tourId: "tour-1",
      startDateTime: new Date("2026-04-19T03:00:00Z"),
      endDateTime: new Date("2026-04-19T04:00:00Z"),
      capacity: 3,
      status: "OPEN",
      sourceRuleId: null,
    });

    await reassignBookingSchedule({
      bookingId: BOOKING_ID,
      target: { kind: "EXISTING", scheduleId: TARGET_SCHEDULE_ID },
    });

    expect(prismaMock.tourSchedule.update).toHaveBeenNthCalledWith(1, {
      where: { id: OLD_SCHEDULE_ID },
      data: { capacity: 2, status: "OPEN" },
    });
  });

  it("does NOT touch a manually-CANCELLED old schedule's status", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(buildBooking());
    prismaMock.tourSchedule.findUnique.mockResolvedValueOnce({
      id: TARGET_SCHEDULE_ID,
      tourId: "tour-1",
      startDateTime: new Date("2026-04-19T03:00:00Z"),
      endDateTime: new Date("2026-04-19T04:00:00Z"),
      status: "OPEN",
    });
    assessMock.mockResolvedValueOnce({ ok: true });
    // Operator manually cancelled the old schedule earlier — we must respect it.
    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      capacity: 0,
      status: "CANCELLED",
    });
    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      capacity: 5,
    });
    prismaMock.booking.update.mockResolvedValueOnce({
      id: BOOKING_ID,
      tourScheduleId: TARGET_SCHEDULE_ID,
      status: "PENDING",
      assignmentState: "TENTATIVE",
      numberOfGuests: 2,
    });
    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      id: TARGET_SCHEDULE_ID,
      tourId: "tour-1",
      startDateTime: new Date("2026-04-19T03:00:00Z"),
      endDateTime: new Date("2026-04-19T04:00:00Z"),
      capacity: 3,
      status: "OPEN",
      sourceRuleId: null,
    });

    await reassignBookingSchedule({
      bookingId: BOOKING_ID,
      target: { kind: "EXISTING", scheduleId: TARGET_SCHEDULE_ID },
    });

    expect(prismaMock.tourSchedule.update).toHaveBeenNthCalledWith(1, {
      where: { id: OLD_SCHEDULE_ID },
      data: { capacity: 2 },
    });
  });

  it("flips target to FULL when capacity reaches 0", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(buildBooking());
    prismaMock.tourSchedule.findUnique.mockResolvedValueOnce({
      id: TARGET_SCHEDULE_ID,
      tourId: "tour-1",
      startDateTime: new Date("2026-04-19T03:00:00Z"),
      endDateTime: new Date("2026-04-19T04:00:00Z"),
      status: "OPEN",
    });
    assessMock.mockResolvedValueOnce({ ok: true });
    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      capacity: 8,
      status: "OPEN",
    });
    // Target capacity exactly 2 — drops to 0, should become FULL
    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      capacity: 2,
    });
    prismaMock.booking.update.mockResolvedValueOnce({
      id: BOOKING_ID,
      tourScheduleId: TARGET_SCHEDULE_ID,
      status: "PENDING",
      assignmentState: "TENTATIVE",
      numberOfGuests: 2,
    });
    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      id: TARGET_SCHEDULE_ID,
      tourId: "tour-1",
      startDateTime: new Date("2026-04-19T03:00:00Z"),
      endDateTime: new Date("2026-04-19T04:00:00Z"),
      capacity: 0,
      status: "FULL",
      sourceRuleId: null,
    });

    await reassignBookingSchedule({
      bookingId: BOOKING_ID,
      target: { kind: "EXISTING", scheduleId: TARGET_SCHEDULE_ID },
    });

    expect(prismaMock.tourSchedule.update).toHaveBeenNthCalledWith(2, {
      where: { id: TARGET_SCHEDULE_ID },
      data: { capacity: 0, status: "FULL" },
    });
  });
});

describe("reassignBookingSchedule — NEW target success", () => {
  it("creates a new schedule with rule-derived capacity and end time", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(buildBooking());
    assessMock.mockResolvedValueOnce({ ok: true });
    matchMock.mockReturnValueOnce({ id: "rule-1", capacity: 6 });

    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      capacity: 8,
      status: "OPEN",
    });
    prismaMock.tourSchedule.create.mockResolvedValueOnce({
      id: "new-created",
      tourId: "tour-1",
      startDateTime: new Date("2026-04-19T03:00:00Z"),
      endDateTime: new Date("2026-04-19T04:00:00Z"),
      capacity: 4,
      status: "OPEN",
      sourceRuleId: "rule-1",
    });
    prismaMock.booking.update.mockResolvedValueOnce({
      id: BOOKING_ID,
      tourScheduleId: "new-created",
      status: "PENDING",
      assignmentState: "TENTATIVE",
      numberOfGuests: 2,
    });
    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      id: "new-created",
      tourId: "tour-1",
      startDateTime: new Date("2026-04-19T03:00:00Z"),
      endDateTime: new Date("2026-04-19T04:00:00Z"),
      capacity: 4,
      status: "OPEN",
      sourceRuleId: "rule-1",
    });

    const result = await reassignBookingSchedule({
      bookingId: BOOKING_ID,
      target: {
        kind: "NEW",
        startDateTime: new Date("2026-04-19T03:00:00Z"),
      },
    });

    expect(result.ok).toBe(true);
    expect(prismaMock.tourSchedule.create).toHaveBeenCalledWith({
      data: {
        tourId: "tour-1",
        startDateTime: new Date("2026-04-19T03:00:00Z"),
        endDateTime: new Date("2026-04-19T04:00:00Z"),
        capacity: 4,
        status: "OPEN",
        sourceRuleId: "rule-1",
      },
    });
  });
});

describe("reassignBookingSchedule — assessment NG", () => {
  it("propagates TIME_SLOT_FULL from the acceptance pipeline", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(buildBooking());
    prismaMock.tourSchedule.findUnique.mockResolvedValueOnce({
      id: TARGET_SCHEDULE_ID,
      tourId: "tour-1",
      startDateTime: new Date("2026-04-19T03:00:00Z"),
      endDateTime: new Date("2026-04-19T04:00:00Z"),
      status: "OPEN",
    });
    assessMock.mockResolvedValueOnce({ ok: false, reason: "TIME_SLOT_FULL" });

    const result = await reassignBookingSchedule({
      bookingId: BOOKING_ID,
      target: { kind: "EXISTING", scheduleId: TARGET_SCHEDULE_ID },
    });

    expect(result).toEqual({ ok: false, reason: "TIME_SLOT_FULL" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("propagates BOOKING_CUTOFF_EXCEEDED for NEW target", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(buildBooking());
    assessMock.mockResolvedValueOnce({
      ok: false,
      reason: "BOOKING_CUTOFF_EXCEEDED",
    });

    const result = await reassignBookingSchedule({
      bookingId: BOOKING_ID,
      target: {
        kind: "NEW",
        startDateTime: new Date("2026-04-19T03:00:00Z"),
      },
    });

    expect(result).toEqual({ ok: false, reason: "BOOKING_CUTOFF_EXCEEDED" });
  });

  it("overrides DAILY_CAPACITY_EXCEEDED on a same-JST-day move (self-double-counted)", async () => {
    // Booking lives on 2026-04-19 JST (UTC 01:00 = 10:00 JST). Move to 16:00 JST same day.
    prismaMock.booking.findUnique.mockResolvedValueOnce(buildBooking());
    prismaMock.tourSchedule.findUnique.mockResolvedValueOnce({
      id: TARGET_SCHEDULE_ID,
      tourId: "tour-1",
      startDateTime: new Date("2026-04-19T07:00:00Z"), // 16:00 JST same day
      endDateTime: new Date("2026-04-19T08:00:00Z"),
      status: "OPEN",
    });
    assessMock.mockResolvedValueOnce({
      ok: false,
      reason: "DAILY_CAPACITY_EXCEEDED",
    });

    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      capacity: 8,
      status: "OPEN",
    });
    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      capacity: 5,
    });
    prismaMock.booking.update.mockResolvedValueOnce({
      id: BOOKING_ID,
      tourScheduleId: TARGET_SCHEDULE_ID,
      status: "PENDING",
      assignmentState: "TENTATIVE",
      numberOfGuests: 2,
    });
    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      id: TARGET_SCHEDULE_ID,
      tourId: "tour-1",
      startDateTime: new Date("2026-04-19T07:00:00Z"),
      endDateTime: new Date("2026-04-19T08:00:00Z"),
      capacity: 3,
      status: "OPEN",
      sourceRuleId: null,
    });

    const result = await reassignBookingSchedule({
      bookingId: BOOKING_ID,
      target: { kind: "EXISTING", scheduleId: TARGET_SCHEDULE_ID },
    });

    expect(result.ok).toBe(true);
  });

  it("keeps DAILY_CAPACITY_EXCEEDED on a different-JST-day move (legitimately exceeded)", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(buildBooking());
    prismaMock.tourSchedule.findUnique.mockResolvedValueOnce({
      id: TARGET_SCHEDULE_ID,
      tourId: "tour-1",
      // 2026-04-20 03:00 UTC = 12:00 JST → different JST day
      startDateTime: new Date("2026-04-20T03:00:00Z"),
      endDateTime: new Date("2026-04-20T04:00:00Z"),
      status: "OPEN",
    });
    assessMock.mockResolvedValueOnce({
      ok: false,
      reason: "DAILY_CAPACITY_EXCEEDED",
    });

    const result = await reassignBookingSchedule({
      bookingId: BOOKING_ID,
      target: { kind: "EXISTING", scheduleId: TARGET_SCHEDULE_ID },
    });

    expect(result).toEqual({ ok: false, reason: "DAILY_CAPACITY_EXCEEDED" });
  });
});

describe("reassignBookingSchedule — PRIVATE", () => {
  it("throws PrivateScheduleAlreadyBookedError if EXISTING target has another booking", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({
        tourSchedule: {
          id: OLD_SCHEDULE_ID,
          startDateTime: new Date("2026-04-19T01:00:00Z"),
          endDateTime: new Date("2026-04-19T02:00:00Z"),
          tour: {
            id: "tour-priv",
            tourType: "PRIVATE",
            durationMinutes: 60,
            maxParticipants: 1,
            capacityRules: [],
          },
        },
      })
    );
    prismaMock.tourSchedule.findUnique.mockResolvedValueOnce({
      id: TARGET_SCHEDULE_ID,
      tourId: "tour-priv",
      startDateTime: new Date("2026-04-19T03:00:00Z"),
      endDateTime: new Date("2026-04-19T04:00:00Z"),
      status: "OPEN",
    });
    prismaMock.booking.findFirst.mockResolvedValueOnce({ id: "other-booking" });

    await expect(
      reassignBookingSchedule({
        bookingId: BOOKING_ID,
        target: { kind: "EXISTING", scheduleId: TARGET_SCHEDULE_ID },
      })
    ).rejects.toBeInstanceOf(PrivateScheduleAlreadyBookedError);
  });

  it("excludes self when checking PRIVATE EXISTING target occupancy", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({
        tourSchedule: {
          id: OLD_SCHEDULE_ID,
          startDateTime: new Date("2026-04-19T01:00:00Z"),
          endDateTime: new Date("2026-04-19T02:00:00Z"),
          tour: {
            id: "tour-priv",
            tourType: "PRIVATE",
            durationMinutes: 60,
            maxParticipants: 1,
            capacityRules: [],
          },
        },
      })
    );
    prismaMock.tourSchedule.findUnique.mockResolvedValueOnce({
      id: TARGET_SCHEDULE_ID,
      tourId: "tour-priv",
      startDateTime: new Date("2026-04-19T03:00:00Z"),
      endDateTime: new Date("2026-04-19T04:00:00Z"),
      status: "OPEN",
    });
    prismaMock.booking.findFirst.mockResolvedValueOnce(null);
    assessMock.mockResolvedValueOnce({ ok: true });

    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      capacity: 0,
      status: "FULL",
    });
    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      capacity: 1,
    });
    prismaMock.booking.update.mockResolvedValueOnce({
      id: BOOKING_ID,
      tourScheduleId: TARGET_SCHEDULE_ID,
      status: "PENDING",
      assignmentState: "TENTATIVE",
      numberOfGuests: 2,
    });
    prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
      id: TARGET_SCHEDULE_ID,
      tourId: "tour-priv",
      startDateTime: new Date("2026-04-19T03:00:00Z"),
      endDateTime: new Date("2026-04-19T04:00:00Z"),
      capacity: 0,
      status: "FULL",
      sourceRuleId: null,
    });

    const result = await reassignBookingSchedule({
      bookingId: BOOKING_ID,
      target: { kind: "EXISTING", scheduleId: TARGET_SCHEDULE_ID },
    });
    expect(result.ok).toBe(true);
    expect(prismaMock.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: BOOKING_ID },
        }),
      })
    );
  });
});
