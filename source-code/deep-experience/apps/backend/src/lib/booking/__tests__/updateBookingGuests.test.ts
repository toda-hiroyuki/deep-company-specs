import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, fetchContextMock } = vi.hoisted(() => {
  const txTable = () => ({
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  });
  const tables = {
    booking: txTable(),
    tourSchedule: txTable(),
    pricingCategory: txTable(),
    ratePrice: txTable(),
  };
  return {
    prismaMock: {
      ...tables,
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(tables)),
    },
    fetchContextMock: vi.fn(),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/capacity/fetchContext", () => ({
  fetchContext: fetchContextMock,
}));

import { updateBookingGuests } from "../updateBookingGuests";

const BOOKING_ID = "booking-1";
const SCHEDULE_ID = "sched-1";
const TOUR_ID = "tour-1";
const SCHEDULE_START = new Date("2026-04-19T01:00:00Z"); // 10:00 JST
const NOW_BEFORE_CUTOFF = new Date("2026-04-18T12:00:00Z"); // plenty before start
const NOW_INSIDE_CUTOFF = new Date("2026-04-19T00:30:00Z"); // 30 min before start

type BookingOverrides = Partial<{
  status: string;
  assignmentState: string;
  numberOfGuests: number;
  rateId: string | null;
  scheduleStatus: string;
  pricePerPersonCents: number;
}>;

function buildBooking(overrides: BookingOverrides = {}) {
  return {
    id: BOOKING_ID,
    tourScheduleId: SCHEDULE_ID,
    numberOfGuests: overrides.numberOfGuests ?? 2,
    status: overrides.status ?? "PENDING",
    assignmentState: overrides.assignmentState ?? "TENTATIVE",
    rateId: overrides.rateId ?? null,
    tourSchedule: {
      id: SCHEDULE_ID,
      startDateTime: SCHEDULE_START,
      endDateTime: new Date("2026-04-19T02:00:00Z"),
      capacity: 4,
      status: overrides.scheduleStatus ?? "OPEN",
      tour: {
        id: TOUR_ID,
        tourType: "GROUP",
        durationMinutes: 60,
        maxParticipants: 10,
        pricePerPersonCents: overrides.pricePerPersonCents ?? 2500,
        capacityRules: [],
      },
    },
  };
}

type CtxOverrides = Partial<{
  dailyCapacity: number | null;
  maxParticipants: number;
  bookingCutoffMinutes: number | null;
  remainingCapacity: number;
  currentGuests: number;
  bookedGuests: number;
  rule: null | {
    id: string;
    minParticipants: number;
    maxPerBooking: number | null;
    minPerBooking: number;
    priority: number;
    isActive: boolean;
  };
}>;

function buildCtx(o: CtxOverrides = {}) {
  return {
    tour: {
      maxParticipants: o.maxParticipants ?? 10,
      dailyCapacity: o.dailyCapacity ?? null,
      maxDeparturesPerDay: null,
      bookingCutoffMinutes: o.bookingCutoffMinutes ?? null,
    },
    applicableRule: o.rule ?? null,
    schedule: {
      scheduleId: SCHEDULE_ID,
      remainingCapacity: o.remainingCapacity ?? 3,
      currentGuests: o.currentGuests ?? 2,
      sourceRuleId: null,
    },
    daily: {
      dateKey: "2026-04-19",
      bookedGuests: o.bookedGuests ?? 2,
      departureCount: 1,
    },
    closeOut: { isClosed: false },
    now: NOW_BEFORE_CUTOFF,
    input: {} as unknown,
  };
}

function primeTxSchedule(capacity: number, status: string) {
  prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
    capacity,
    status,
  });
}

function primeTxBookingUpdate(newGuests: number, newTotal: number) {
  prismaMock.booking.update.mockResolvedValueOnce({
    id: BOOKING_ID,
    tourScheduleId: SCHEDULE_ID,
    numberOfGuests: newGuests,
    totalPriceCents: newTotal,
    assignmentState: "TENTATIVE",
    status: "PENDING",
    rateId: null,
  });
}

function primeTxScheduleFinal(capacity: number, status: string) {
  prismaMock.tourSchedule.findUniqueOrThrow.mockResolvedValueOnce({
    id: SCHEDULE_ID,
    tourId: TOUR_ID,
    startDateTime: SCHEDULE_START,
    endDateTime: new Date("2026-04-19T02:00:00Z"),
    capacity,
    status,
    sourceRuleId: null,
  });
}

function resetMocks() {
  prismaMock.booking.findUnique.mockReset();
  prismaMock.booking.findUniqueOrThrow.mockReset();
  prismaMock.booking.findFirst.mockReset();
  prismaMock.booking.update.mockReset();
  prismaMock.tourSchedule.findUnique.mockReset();
  prismaMock.tourSchedule.findUniqueOrThrow.mockReset();
  prismaMock.tourSchedule.findFirst.mockReset();
  prismaMock.tourSchedule.update.mockReset();
  prismaMock.pricingCategory.findFirst.mockReset();
  prismaMock.ratePrice.findFirst.mockReset();
  prismaMock.$transaction.mockClear();
  prismaMock.$transaction.mockImplementation(
    async (fn: (tx: unknown) => unknown) =>
      fn({
        booking: prismaMock.booking,
        tourSchedule: prismaMock.tourSchedule,
      })
  );
  fetchContextMock.mockReset();
}

beforeEach(() => {
  resetMocks();
});

describe("updateBookingGuests — guards", () => {
  it("returns BOOKING_NOT_FOUND when booking is missing", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(null);
    const result = await updateBookingGuests({
      bookingId: BOOKING_ID,
      newNumberOfGuests: 3,
    });
    expect(result).toEqual({ ok: false, reason: "BOOKING_NOT_FOUND" });
  });

  it("returns BOOKING_NOT_ACTIVE for CANCELLED/COMPLETED/IN_PROGRESS/EXPIRED bookings", async () => {
    for (const status of ["CANCELLED", "COMPLETED", "IN_PROGRESS", "EXPIRED"]) {
      resetMocks();
      prismaMock.booking.findUnique.mockResolvedValueOnce(
        buildBooking({ status })
      );
      const result = await updateBookingGuests({
        bookingId: BOOKING_ID,
        newNumberOfGuests: 3,
      });
      expect(result).toEqual({ ok: false, reason: "BOOKING_NOT_ACTIVE" });
    }
  });

  it("returns BOOKING_NOT_ACTIVE when schedule is CANCELLED (defensive)", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({ scheduleStatus: "CANCELLED" })
    );
    const result = await updateBookingGuests({
      bookingId: BOOKING_ID,
      newNumberOfGuests: 3,
    });
    expect(result).toEqual({ ok: false, reason: "BOOKING_NOT_ACTIVE" });
  });

  it("returns GUESTS_UNCHANGED when old === new", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({ numberOfGuests: 2 })
    );
    const result = await updateBookingGuests({
      bookingId: BOOKING_ID,
      newNumberOfGuests: 2,
    });
    expect(result).toEqual({ ok: false, reason: "GUESTS_UNCHANGED" });
  });

  it("allows FINALIZED bookings", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({ assignmentState: "FINALIZED", numberOfGuests: 2 })
    );
    fetchContextMock.mockResolvedValueOnce(buildCtx({ remainingCapacity: 3 }));
    primeTxSchedule(4, "OPEN");
    primeTxBookingUpdate(3, 7500);
    primeTxScheduleFinal(3, "OPEN");

    const result = await updateBookingGuests({
      bookingId: BOOKING_ID,
      newNumberOfGuests: 3,
      now: NOW_BEFORE_CUTOFF,
    });
    expect(result.ok).toBe(true);
  });
});

describe("updateBookingGuests — increase success", () => {
  it("increases by 1 (capacity 4 → 3) and recalculates totalPriceCents", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({ numberOfGuests: 2 })
    );
    fetchContextMock.mockResolvedValueOnce(buildCtx({ remainingCapacity: 3 }));
    primeTxSchedule(4, "OPEN");
    primeTxBookingUpdate(3, 7500);
    primeTxScheduleFinal(3, "OPEN");

    const result = await updateBookingGuests({
      bookingId: BOOKING_ID,
      newNumberOfGuests: 3,
      now: NOW_BEFORE_CUTOFF,
    });

    expect(result.ok).toBe(true);
    expect(prismaMock.tourSchedule.update).toHaveBeenCalledWith({
      where: { id: SCHEDULE_ID },
      data: { capacity: 3 },
    });
    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: { id: BOOKING_ID },
      data: { numberOfGuests: 3, totalPriceCents: 7500 },
    });
  });

  it("flips OPEN → FULL when capacity reaches 0", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({ numberOfGuests: 2 })
    );
    fetchContextMock.mockResolvedValueOnce(buildCtx({ remainingCapacity: 1 }));
    primeTxSchedule(1, "OPEN");
    primeTxBookingUpdate(3, 7500);
    primeTxScheduleFinal(0, "FULL");

    const result = await updateBookingGuests({
      bookingId: BOOKING_ID,
      newNumberOfGuests: 3,
      now: NOW_BEFORE_CUTOFF,
    });

    expect(result.ok).toBe(true);
    expect(prismaMock.tourSchedule.update).toHaveBeenCalledWith({
      where: { id: SCHEDULE_ID },
      data: { capacity: 0, status: "FULL" },
    });
  });
});

describe("updateBookingGuests — increase rejections", () => {
  it("rejects with TIME_SLOT_FULL when delta > remainingCapacity", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({ numberOfGuests: 2 })
    );
    fetchContextMock.mockResolvedValueOnce(buildCtx({ remainingCapacity: 1 }));

    const result = await updateBookingGuests({
      bookingId: BOOKING_ID,
      newNumberOfGuests: 5, // delta = 3 > remaining = 1
      now: NOW_BEFORE_CUTOFF,
    });

    expect(result).toEqual({ ok: false, reason: "TIME_SLOT_FULL" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects with DAILY_CAPACITY_EXCEEDED accounting for self-double-count", async () => {
    // old=2, new=5, delta=+3. Other bookings contribute 4 (bookedGuests=2+4=6).
    // dailyCapacity=8 → projected = 6 - 2 + 5 = 9 > 8 → rejected.
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({ numberOfGuests: 2 })
    );
    fetchContextMock.mockResolvedValueOnce(
      buildCtx({
        remainingCapacity: 10,
        bookedGuests: 6,
        dailyCapacity: 8,
      })
    );

    const result = await updateBookingGuests({
      bookingId: BOOKING_ID,
      newNumberOfGuests: 5,
      now: NOW_BEFORE_CUTOFF,
    });
    expect(result).toEqual({ ok: false, reason: "DAILY_CAPACITY_EXCEEDED" });
  });

  it("allows increase that stays within daily cap despite self being counted (regression guard)", async () => {
    // old=2, new=3, delta=+1. bookedGuests=5 (other=3+self=2). cap=6.
    // Without override the naive check (5+3=8>6) would reject, but after
    // swapping self 5-2+3=6 ≤ 6 → allowed.
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({ numberOfGuests: 2 })
    );
    fetchContextMock.mockResolvedValueOnce(
      buildCtx({
        remainingCapacity: 5,
        bookedGuests: 5,
        dailyCapacity: 6,
      })
    );
    primeTxSchedule(5, "OPEN");
    primeTxBookingUpdate(3, 7500);
    primeTxScheduleFinal(4, "OPEN");

    const result = await updateBookingGuests({
      bookingId: BOOKING_ID,
      newNumberOfGuests: 3,
      now: NOW_BEFORE_CUTOFF,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects with MAX_PARTICIPANTS_EXCEEDED when tour.maxParticipants is exceeded", async () => {
    // tour.maxParticipants=5, currentGuests=5 (self=2+others=3), newGuests=4
    // projected = 5 - 2 + 4 = 7 > 5 → reject
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({ numberOfGuests: 2 })
    );
    fetchContextMock.mockResolvedValueOnce(
      buildCtx({
        remainingCapacity: 10, // pass TIME_SLOT
        currentGuests: 5,
        maxParticipants: 5,
      })
    );

    const result = await updateBookingGuests({
      bookingId: BOOKING_ID,
      newNumberOfGuests: 4,
      now: NOW_BEFORE_CUTOFF,
    });
    expect(result).toEqual({
      ok: false,
      reason: "MAX_PARTICIPANTS_EXCEEDED",
    });
  });

  it("rejects with MAX_PARTICIPANTS_EXCEEDED when rule.maxPerBooking is exceeded", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({ numberOfGuests: 2 })
    );
    fetchContextMock.mockResolvedValueOnce(
      buildCtx({
        remainingCapacity: 10,
        rule: {
          id: "rule-1",
          minParticipants: 1,
          maxPerBooking: 3,
          minPerBooking: 1,
          priority: 0,
          isActive: true,
        },
      })
    );

    const result = await updateBookingGuests({
      bookingId: BOOKING_ID,
      newNumberOfGuests: 4,
      now: NOW_BEFORE_CUTOFF,
    });
    expect(result).toEqual({
      ok: false,
      reason: "MAX_PARTICIPANTS_EXCEEDED",
    });
  });

  it("rejects with BOOKING_CUTOFF_EXCEEDED on increase after cutoff", async () => {
    // Start 2026-04-19 01:00 UTC, now 00:30 UTC = 30min before start.
    // cutoff=60 → 30 < 60 → reject.
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({ numberOfGuests: 2 })
    );
    fetchContextMock.mockResolvedValueOnce(
      buildCtx({
        remainingCapacity: 5,
        bookingCutoffMinutes: 60,
      })
    );

    const result = await updateBookingGuests({
      bookingId: BOOKING_ID,
      newNumberOfGuests: 3,
      now: NOW_INSIDE_CUTOFF,
    });
    expect(result).toEqual({ ok: false, reason: "BOOKING_CUTOFF_EXCEEDED" });
  });
});

describe("updateBookingGuests — decrease", () => {
  it("decreases by 2, FULL → OPEN flip", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({ numberOfGuests: 3 })
    );
    fetchContextMock.mockResolvedValueOnce(buildCtx({ remainingCapacity: 0 }));
    primeTxSchedule(0, "FULL");
    primeTxBookingUpdate(1, 2500);
    primeTxScheduleFinal(2, "OPEN");

    const result = await updateBookingGuests({
      bookingId: BOOKING_ID,
      newNumberOfGuests: 1,
      now: NOW_BEFORE_CUTOFF,
    });
    expect(result.ok).toBe(true);
    expect(prismaMock.tourSchedule.update).toHaveBeenCalledWith({
      where: { id: SCHEDULE_ID },
      data: { capacity: 2, status: "OPEN" },
    });
  });

  it("rejects with MIN_PARTICIPANTS_NOT_MET when newGuests < rule.minPerBooking", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({ numberOfGuests: 3 })
    );
    fetchContextMock.mockResolvedValueOnce(
      buildCtx({
        rule: {
          id: "rule-1",
          minParticipants: 1,
          maxPerBooking: null,
          minPerBooking: 2,
          priority: 0,
          isActive: true,
        },
      })
    );

    const result = await updateBookingGuests({
      bookingId: BOOKING_ID,
      newNumberOfGuests: 1,
      now: NOW_BEFORE_CUTOFF,
    });
    expect(result).toEqual({ ok: false, reason: "MIN_PARTICIPANTS_NOT_MET" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("allows decrease even when minParticipants (departure-wide floor) would be violated", async () => {
    // rule.minParticipants=4. current schedule-wide guests = 4 (self=3+other=1).
    // After decrease to 2, total = 3 < 4 → but we do NOT enforce this.
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({ numberOfGuests: 3 })
    );
    fetchContextMock.mockResolvedValueOnce(
      buildCtx({
        currentGuests: 4,
        rule: {
          id: "rule-1",
          minParticipants: 4,
          maxPerBooking: null,
          minPerBooking: 1,
          priority: 0,
          isActive: true,
        },
      })
    );
    primeTxSchedule(4, "OPEN");
    primeTxBookingUpdate(2, 5000);
    primeTxScheduleFinal(5, "OPEN");

    const result = await updateBookingGuests({
      bookingId: BOOKING_ID,
      newNumberOfGuests: 2,
      now: NOW_BEFORE_CUTOFF,
    });
    expect(result.ok).toBe(true);
  });

  it("allows decrease after cutoff (cutoff only applies to increases)", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({ numberOfGuests: 3 })
    );
    fetchContextMock.mockResolvedValueOnce(
      buildCtx({ bookingCutoffMinutes: 60 })
    );
    primeTxSchedule(4, "OPEN");
    primeTxBookingUpdate(2, 5000);
    primeTxScheduleFinal(5, "OPEN");

    const result = await updateBookingGuests({
      bookingId: BOOKING_ID,
      newNumberOfGuests: 2,
      now: NOW_INSIDE_CUTOFF,
    });
    expect(result.ok).toBe(true);
  });
});

describe("updateBookingGuests — totalPriceCents recalculation", () => {
  it("uses rateId + isDefault PricingCategory RatePrice when available", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({ numberOfGuests: 2, rateId: "rate-1" })
    );
    fetchContextMock.mockResolvedValueOnce(buildCtx({ remainingCapacity: 3 }));
    prismaMock.pricingCategory.findFirst.mockResolvedValueOnce({
      id: "pc-default",
    });
    prismaMock.ratePrice.findFirst.mockResolvedValueOnce({ priceCents: 3000 });
    primeTxSchedule(4, "OPEN");
    primeTxBookingUpdate(3, 9000);
    primeTxScheduleFinal(3, "OPEN");

    const result = await updateBookingGuests({
      bookingId: BOOKING_ID,
      newNumberOfGuests: 3,
      now: NOW_BEFORE_CUTOFF,
    });
    expect(result.ok).toBe(true);
    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: { id: BOOKING_ID },
      data: { numberOfGuests: 3, totalPriceCents: 9000 },
    });
  });

  it("falls back to tour.pricePerPersonCents when rateId is null (legacy)", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({
        numberOfGuests: 2,
        rateId: null,
        pricePerPersonCents: 2500,
      })
    );
    fetchContextMock.mockResolvedValueOnce(buildCtx({ remainingCapacity: 3 }));
    primeTxSchedule(4, "OPEN");
    primeTxBookingUpdate(3, 7500);
    primeTxScheduleFinal(3, "OPEN");

    const result = await updateBookingGuests({
      bookingId: BOOKING_ID,
      newNumberOfGuests: 3,
      now: NOW_BEFORE_CUTOFF,
    });
    expect(result.ok).toBe(true);
    // fallback path should not query rate/pricing tables
    expect(prismaMock.pricingCategory.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.ratePrice.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: { id: BOOKING_ID },
      data: { numberOfGuests: 3, totalPriceCents: 7500 },
    });
  });

  it("falls back to tour.pricePerPersonCents when matching RatePrice is missing", async () => {
    prismaMock.booking.findUnique.mockResolvedValueOnce(
      buildBooking({
        numberOfGuests: 2,
        rateId: "rate-1",
        pricePerPersonCents: 2500,
      })
    );
    fetchContextMock.mockResolvedValueOnce(buildCtx({ remainingCapacity: 3 }));
    prismaMock.pricingCategory.findFirst.mockResolvedValueOnce({
      id: "pc-default",
    });
    prismaMock.ratePrice.findFirst.mockResolvedValueOnce(null);
    primeTxSchedule(4, "OPEN");
    primeTxBookingUpdate(3, 7500);
    primeTxScheduleFinal(3, "OPEN");

    const result = await updateBookingGuests({
      bookingId: BOOKING_ID,
      newNumberOfGuests: 3,
      now: NOW_BEFORE_CUTOFF,
    });
    expect(result.ok).toBe(true);
    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: { id: BOOKING_ID },
      data: { numberOfGuests: 3, totalPriceCents: 7500 },
    });
  });
});
