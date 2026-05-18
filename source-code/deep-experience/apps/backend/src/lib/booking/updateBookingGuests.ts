import type { Booking, TourSchedule } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchContext } from "@/lib/capacity/fetchContext";
import type { BookingRejectionReason } from "@/lib/capacity/types";
import { resolveUnitPriceCents } from "./resolveUnitPriceCents";

// Manual booking-guest-count update service.
//
// Responsibility: change Booking.numberOfGuests and keep every denormalized
// counter on the attached TourSchedule in sync. Delta-aware — the acceptance
// pipeline's self-double-counting is corrected at this layer so the shared
// pipeline from Issue #2 stays untouched (same pattern as reassignBookingSchedule).
//
// Out of scope: schedule reassignment (see reassignBookingSchedule), BookingPassenger
// row sync (tracked separately), concurrent-write race mitigation (deferred to the
// Postgres migration — SQLite dev relies on single-writer).

const NON_MODIFIABLE_BOOKING_STATUSES = new Set([
  "CANCELLED",
  "EXPIRED",
  "COMPLETED",
  "IN_PROGRESS",
]);

export type UpdateBookingGuestsInput = {
  bookingId: string;
  newNumberOfGuests: number;
  now?: Date;
};

export type UpdateBookingGuestsReason =
  | BookingRejectionReason
  | "BOOKING_NOT_FOUND"
  | "BOOKING_NOT_ACTIVE"
  | "GUESTS_UNCHANGED";

export type UpdateBookingGuestsSuccess = {
  ok: true;
  booking: Booking;
  schedule: TourSchedule;
};

export type UpdateBookingGuestsResult =
  | UpdateBookingGuestsSuccess
  | { ok: false; reason: UpdateBookingGuestsReason };

export async function updateBookingGuests(
  input: UpdateBookingGuestsInput
): Promise<UpdateBookingGuestsResult> {
  if (
    !Number.isInteger(input.newNumberOfGuests) ||
    input.newNumberOfGuests < 1
  ) {
    throw new Error("newNumberOfGuests must be a positive integer");
  }

  const now = input.now ?? new Date();

  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: {
      tourSchedule: {
        include: {
          tour: {
            include: {
              capacityRules: {
                where: { isActive: true },
                orderBy: { priority: "desc" },
              },
            },
          },
        },
      },
    },
  });
  if (!booking) return { ok: false, reason: "BOOKING_NOT_FOUND" };
  if (NON_MODIFIABLE_BOOKING_STATUSES.has(booking.status)) {
    return { ok: false, reason: "BOOKING_NOT_ACTIVE" };
  }
  // Defensive: an active booking under a CANCELLED schedule violates the
  // §7.2.1 invariant (non-CANCELLED bookings must be 0 on a cancelled
  // schedule). Treat as non-modifiable rather than silently mutating the
  // counters of a cancelled departure.
  if (booking.tourSchedule.status === "CANCELLED") {
    return { ok: false, reason: "BOOKING_NOT_ACTIVE" };
  }

  const oldGuests = booking.numberOfGuests;
  const newGuests = input.newNumberOfGuests;
  const delta = newGuests - oldGuests;
  if (delta === 0) return { ok: false, reason: "GUESTS_UNCHANGED" };

  const schedule = booking.tourSchedule;
  const tour = schedule.tour;

  const ctx = await fetchContext({
    tourId: tour.id,
    scheduleId: schedule.id,
    startDateTime: schedule.startDateTime,
    requestedGuests: newGuests,
    isNewDeparture: false,
    now,
  });
  const rule = ctx.applicableRule;

  // minPerBooking is enforced on both increase and decrease — falling below
  // the per-booking minimum violates the booking-formation rule regardless of
  // direction.
  if (rule && newGuests < rule.minPerBooking) {
    return { ok: false, reason: "MIN_PARTICIPANTS_NOT_MET" };
  }

  if (delta > 0) {
    // remainingCapacity is already post-old-subtraction, so we compare delta.
    const remaining = ctx.schedule?.remainingCapacity ?? 0;
    if (delta > remaining) {
      return { ok: false, reason: "TIME_SLOT_FULL" };
    }
    // daily.bookedGuests already includes this booking's old headcount; swap
    // old for new to get the post-update projection.
    if (ctx.tour.dailyCapacity !== null) {
      const projectedDaily = ctx.daily.bookedGuests - oldGuests + newGuests;
      if (projectedDaily > ctx.tour.dailyCapacity) {
        return { ok: false, reason: "DAILY_CAPACITY_EXCEEDED" };
      }
    }
    // Tour-wide cap (schedule.currentGuests includes self, so subtract old first).
    const currentGuests = ctx.schedule?.currentGuests ?? 0;
    const projectedScheduleGuests = currentGuests - oldGuests + newGuests;
    if (projectedScheduleGuests > ctx.tour.maxParticipants) {
      return { ok: false, reason: "MAX_PARTICIPANTS_EXCEEDED" };
    }
    if (rule && rule.maxPerBooking !== null && newGuests > rule.maxPerBooking) {
      return { ok: false, reason: "MAX_PARTICIPANTS_EXCEEDED" };
    }
    // Cutoff applies only to increases — a decrease only returns capacity.
    if (ctx.tour.bookingCutoffMinutes !== null) {
      const minutesUntilStart =
        (schedule.startDateTime.getTime() - now.getTime()) / 60_000;
      if (minutesUntilStart < ctx.tour.bookingCutoffMinutes) {
        return { ok: false, reason: "BOOKING_CUTOFF_EXCEEDED" };
      }
    }
  }
  // delta < 0: no further checks. minParticipants (departure-wide floor) is
  // intentionally NOT enforced — that's a go/no-go decision for the departure,
  // not grounds to reject a guest reducing their party size.

  const unitPriceCents = await resolveUnitPriceCents(
    booking.rateId,
    tour.id,
    tour.pricePerPersonCents
  );
  const newTotalPriceCents = unitPriceCents * newGuests;

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.tourSchedule.findUniqueOrThrow({
      where: { id: schedule.id },
      select: { capacity: true, status: true },
    });
    const newRemaining = current.capacity - delta;
    // §7.2: only the auto-managed OPEN↔FULL pair flips automatically. CANCELLED
    // (operator intent) and COMPLETED (terminal) are left alone.
    let nextStatus: string | undefined;
    if (current.status === "OPEN" && newRemaining <= 0) {
      nextStatus = "FULL";
    } else if (current.status === "FULL" && newRemaining > 0) {
      nextStatus = "OPEN";
    }

    await tx.tourSchedule.update({
      where: { id: schedule.id },
      data: {
        capacity: newRemaining,
        ...(nextStatus ? { status: nextStatus } : {}),
      },
    });
    const updatedBooking = await tx.booking.update({
      where: { id: booking.id },
      data: {
        numberOfGuests: newGuests,
        totalPriceCents: newTotalPriceCents,
      },
    });
    const updatedSchedule = await tx.tourSchedule.findUniqueOrThrow({
      where: { id: schedule.id },
    });
    return { booking: updatedBooking, schedule: updatedSchedule };
  });

  return {
    ok: true,
    booking: result.booking,
    schedule: result.schedule,
  };
}
